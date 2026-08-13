import { ProjectStatus, RedFlagType } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { publishToGovQueue } from "../../infrastructure/messaging/gov-queue.publisher";
import { hashAiExplanation } from "../twin/twin.service";
import { auditService } from "../../shared/audit/audit.service";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";
import {
  matchesScopeDistrict,
  normalizeDivisionName,
  resolveScopeContext,
} from "../../shared/scope/scope-context";
import { fetchAi } from "../../shared/http/fetch-ai";
import { getCurrentMandate } from "../../shared/gov/current-mandate";
import { allStaticHazardZones } from "./flood-hotspots.data";
import {
  fetchNewsLocalitiesForWindow,
  fetchWeatherPeaksForWindow,
  findNewsHitForZone,
  findWeatherPeakForZone,
  normKey,
  weatherPeakToZone,
  zoneHasWindowEvidence,
} from "./hazard-window";

export interface PredictiveScore {
  project_id: string;
  title: string;
  flag_type: string;
  confidence: number;
  horizon_days: number;
  risk_factors: string[];
  explanation_bn: string;
  explanation_en: string;
}

function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

interface FaceMatchPayload {
  matched: boolean;
  confidence: number;
  face_detected: boolean;
  face_boxes?: number[][];
  vip_id?: string | null;
  nid?: string | null;
  representative_id?: string | null;
  engine?: string;
}

function roleLabelBn(role: string): string {
  const map: Record<string, string> = {
    MINISTER: "মন্ত্রী",
    MP: "সংসদ সদস্য",
    DC: "জেলা প্রশাসক",
    UNION_CHAIRMAN: "ইউনিয়ন চেয়ারম্যান",
    UPAZILA_CHAIRMAN: "উপজেলা চেয়ারম্যান",
    MAYOR: "মেয়র",
  };
  return map[role] ?? role.replace(/_/g, " ");
}

interface HazardZoneRecord {
  zone_id: string;
  name: string;
  name_bn: string;
  hazard_type: string;
  risk_level: number;
  division: string;
  lat: number;
  lng: number;
  radius_km: number;
  district?: string;
  locality?: string;
  locality_bn?: string;
  water_note_bn?: string;
  water_note_en?: string;
  scale?: "local" | "regional";
  source?: string;
  [key: string]: unknown;
}

export class IntelligenceService {
  async getSentimentHeatmap(level: "district" | "upazila" = "district", limit = 100) {
    const { ingestionService } = await import("../ingestion/ingestion.service");
    const hasNews = await ingestionService.hasRecentArticles(7, 5);
    if (hasNews) {
      return ingestionService.buildHeatmap(level, limit);
    }

    const res = await fetchAi(
      `/api/v1/sentiment/heatmap?level=${level}&limit=${limit}`,
    );
    if (!res.ok) throw new Error("Sentiment heatmap unavailable");
    return res.json();
  }

  async scanPredictiveRedFlags(
    query: DashboardScopeQuery = {},
    lang: "bn" | "en" = "bn",
    userId?: string,
  ) {
    const unitId = scopeUnitId(query);

    // Always use ADP project rows with budgets — never zeroed live-signal stubs.
    const projects = await prismaRead.project.findMany({
          where: {
            status: { in: [ProjectStatus.ONGOING, ProjectStatus.STALLED] },
            ...(unitId && { adminUnitId: unitId }),
          },
          select: {
            id: true,
            title: true,
            budgetAllocated: true,
            budgetSpent: true,
            status: true,
            contractorNid: true,
            startDate: true,
            adminUnitId: true,
            redFlagAlerts: {
              where: { resolvedAt: null },
              select: { id: true, flagType: true },
            },
          },
          take: 100,
        });

    const contractorNids = [
      ...new Set(projects.map((p) => p.contractorNid).filter(Boolean) as string[]),
    ];

    const priorFlags =
      contractorNids.length > 0
        ? await prismaRead.redFlagAlert.groupBy({
            by: ["projectId"],
            where: {
              project: { contractorNid: { in: contractorNids } },
            },
            _count: true,
          })
        : [];

    const projectByContractor = new Map<string, number>();
    for (const p of projects) {
      if (!p.contractorNid) continue;
      const count = priorFlags.filter((f) =>
        projects.some((pr) => pr.id === f.projectId && pr.contractorNid === p.contractorNid),
      ).length;
      projectByContractor.set(p.contractorNid, count);
    }

    const aiInput = {
      projects: projects.map((p) => ({
        project_id: p.id,
        title: p.title,
        budget_allocated: Number(p.budgetAllocated),
        budget_spent: Number(p.budgetSpent),
        status: p.status,
        contractor_nid: p.contractorNid,
        open_alerts: p.redFlagAlerts.length,
        contractor_prior_flags: p.contractorNid
          ? (projectByContractor.get(p.contractorNid) ?? 0)
          : 0,
        days_since_start: Math.floor(
          (Date.now() - p.startDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    };

    const res = await fetchAi(`/api/v1/predictive/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiInput),
    });
    if (!res.ok) throw new Error("Predictive scoring unavailable");
    const aiResult = (await res.json()) as { scores: PredictiveScore[]; scanned_at: string };

    if (env.LIVE_DATA_ONLY) {
      return {
        scanned_at: aiResult.scanned_at,
        scores: aiResult.scores,
        alerts_created: 0,
        created: [],
        dataSource: "live_pipeline",
      };
    }

    const created: Array<{ alertId: string; projectId: string; confidence: number }> = [];

    for (const score of aiResult.scores) {
      if (score.confidence < 70) continue;

      const project = projects.find((p) => p.id === score.project_id);
      if (!project) continue;

      const recentPredictive = await prismaRead.redFlagAlert.findFirst({
        where: {
          projectId: score.project_id,
          resolvedAt: null,
          aiExplanation: { contains: "AI Confidence" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentPredictive) continue;

      const explanation = lang === "bn" ? score.explanation_bn : score.explanation_en;
      const flagType = score.flag_type as RedFlagType;
      const severity = score.confidence >= 85 ? 5 : score.confidence >= 75 ? 4 : 3;
      const blockchainHash = hashAiExplanation(explanation, score.project_id);

      const alert = await prismaWrite.redFlagAlert.create({
        data: {
          projectId: score.project_id,
          flagType,
          severity,
          aiExplanation: explanation,
          blockchainHash,
          blockchainVerified: false,
        },
      });

      if (userId) {
        await auditService.log({
          userId,
          action: "AI_PREDICTIVE_ALERT",
          tableName: "red_flag_alerts",
          recordId: alert.id,
          newValue: {
            projectId: score.project_id,
            confidence: score.confidence,
            blockchainHash,
            explanation,
          },
        });
      }

      created.push({
        alertId: alert.id,
        projectId: score.project_id,
        confidence: score.confidence,
      });

      await publishToGovQueue({
        type: "alert_created",
        adminUnitId: project.adminUnitId,
        payload: {
          alertId: alert.id,
          projectId: score.project_id,
          severity,
          flagType,
          predictive: true,
          confidence: score.confidence,
        },
      });
    }

    return {
      scanned_at: aiResult.scanned_at,
      scores: aiResult.scores,
      alerts_created: created.length,
      created,
    };
  }

  async scoreAccountability(unitId?: string, lang: "bn" | "en" = "bn") {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });

    // Current-mandate duty-holders only — never Awami League / ended tenure.
    const reps = await prismaRead.representative.findMany({
      where: {
        ...(unitId ? { adminUnitId: unitId } : {}),
        OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
        AND: [
          { NOT: { party: { contains: "Awami", mode: "insensitive" } } },
          { NOT: { name: { contains: "Hasina", mode: "insensitive" } } },
          {
            OR: [
              { party: { equals: mandate.rulingParty, mode: "insensitive" } },
              { party: { contains: "BCS", mode: "insensitive" } },
              { party: { contains: "Local", mode: "insensitive" } },
              { role: { in: ["DC", "UNION_CHAIRMAN", "UPAZILA_CHAIRMAN", "MAYOR"] } },
            ],
          },
        ],
      },
      include: {
        adminUnit: { select: { name: true, nameBn: true } },
        kpiRecords: {
          take: 20,
          orderBy: { recordedAt: "desc" },
          include: { kpiDef: { select: { code: true, name: true, unit: true } } },
        },
        _count: { select: { kpiRecords: true } },
      },
      take: 50,
    });

    const allKpis = await prismaRead.kpiRecord.findMany({
      select: { value: true, kpiDef: { select: { code: true } } },
      take: 500,
    });

    const grievanceVals = allKpis
      .filter((k) => k.kpiDef.code.toLowerCase().includes("grievance"))
      .map((k) => Number(k.value));
    const completionVals = allKpis
      .filter((k) => /completion|project/i.test(k.kpiDef.code))
      .map((k) => Number(k.value));

    const peerGrievance =
      grievanceVals.length > 0
        ? grievanceVals.reduce((a, b) => a + b, 0) / grievanceVals.length
        : 72;
    const peerCompletion =
      completionVals.length > 0
        ? completionVals.reduce((a, b) => a + b, 0) / completionVals.length
        : 68;

    const repInputs = await Promise.all(
      reps.map(async (rep) => {
        const projects = await prismaRead.project.count({
          where: { adminUnitId: rep.adminUnitId },
        });
        const alerts = await prismaRead.redFlagAlert.count({
          where: {
            resolvedAt: null,
            project: { adminUnitId: rep.adminUnitId },
          },
        });

        return {
          representative_id: rep.id,
          name: rep.name,
          role: rep.role,
          admin_unit_name: rep.adminUnit.nameBn ?? rep.adminUnit.name,
          kpi_snapshots: rep.kpiRecords.map((r) => ({
            code: r.kpiDef.code,
            name: r.kpiDef.name,
            value: Number(r.value),
            unit: r.kpiDef.unit,
          })),
          peer_avg_grievance_resolution: peerGrievance,
          peer_avg_completion: peerCompletion,
          open_alerts: alerts,
          project_count: projects,
          lang,
        };
      }),
    );

    const res = await fetchAi(`/api/v1/accountability/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ representatives: repInputs }),
    });
    if (!res.ok) throw new Error("Accountability scoring unavailable");
    return res.json();
  }

  async analyzeDocument(body: {
    text: string;
    doc_type?: "tender" | "contract";
    contractor_nid?: string;
    lang?: "bn" | "en";
  }) {
    const res = await fetchAi(`/api/v1/documents/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: body.text,
        doc_type: body.doc_type ?? "tender",
        contractor_nid: body.contractor_nid,
        lang: body.lang ?? "bn",
      }),
    });
    if (!res.ok) throw new Error("Document analysis unavailable");
    return res.json();
  }

  async scanPhishing(body: {
    url: string;
    similarity_threshold?: number;
    timeout_seconds?: number;
    official_urls?: string[];
  }) {
    const res = await fetchAi(`/api/v1/phishing/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: body.url,
        similarity_threshold: body.similarity_threshold ?? 0.9,
        timeout_seconds: body.timeout_seconds ?? 12,
        official_urls: body.official_urls,
      }),
    });
    if (!res.ok) throw new Error("Phishing scan unavailable");
    return res.json();
  }

  async registerPhishingOfficials(body: { urls: string[]; timeout_seconds?: number }) {
    const res = await fetchAi(`/api/v1/phishing/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: body.urls,
        timeout_seconds: body.timeout_seconds ?? 12,
      }),
    });
    if (!res.ok) throw new Error("Phishing signature registration unavailable");
    return res.json();
  }

  async registerPhishingDefaults(timeoutSeconds?: number) {
    const q =
      timeoutSeconds != null ? `?timeout_seconds=${encodeURIComponent(String(timeoutSeconds))}` : "";
    const res = await fetchAi(`/api/v1/phishing/register/defaults${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Default phishing registration unavailable");
    return res.json();
  }

  async listPhishingOfficialDomains() {
    const res = await fetchAi(`/api/v1/phishing/official-domains`);
    if (!res.ok) throw new Error("Official domain list unavailable");
    return res.json();
  }

  async getProximityLive(includeDemoVips = true) {
    const q = `?include_demo_vips=${includeDemoVips ? "true" : "false"}`;
    try {
      const res = await fetchAi(`/api/v1/proximity/live${q}`);
      if (!res.ok) throw new Error(`Proximity live feed unavailable (${res.status})`);
      return res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Proximity live feed unavailable";
      throw new Error(message);
    }
  }

  async checkProximity(body: {
    points: Array<{
      lat: number;
      lng: number;
      label?: string;
      source?: string;
      recorded_at?: string;
      track_id?: string;
    }>;
    zone_ids?: string[];
  }) {
    const res = await fetchAi(`/api/v1/proximity/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Proximity geofence check unavailable");
    return res.json();
  }

  async listProximityZones() {
    const res = await fetchAi(`/api/v1/proximity/zones`);
    if (!res.ok) throw new Error("Proximity zones unavailable");
    return res.json();
  }

  async matchFaceIntel(body: {
    image_base64?: string;
    nid?: string;
    threshold?: number;
    demo_fallback?: boolean;
  }) {
    if (body.nid) {
      const res = await fetchAi(`/api/v1/face-intel/match/nid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nid: body.nid, lang: "bn" }),
      });
      if (!res.ok) throw new Error("Face NID match unavailable");
      return res.json() as Promise<{ match: FaceMatchPayload; gallery_size: number }>;
    }
    if (!body.image_base64) throw new Error("image_base64 or nid required");
    const res = await fetchAi(`/api/v1/face-intel/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: body.image_base64,
        threshold: body.threshold ?? 0.72,
        demo_fallback: body.demo_fallback ?? true,
      }),
    });
    if (!res.ok) throw new Error("Face match unavailable");
    return res.json() as Promise<{ match: FaceMatchPayload; gallery_size: number }>;
  }

  async listFaceGallery() {
    const res = await fetchAi(`/api/v1/face-intel/gallery`);
    if (!res.ok) throw new Error("Face gallery unavailable");
    return res.json();
  }

  /**
   * Decision-support Ethical Report Card — last 6 months Prisma window
   * (activities / financial red flags / grievance proxies) for a VIP.
   */
  async buildEthicalReportCard(opts: {
    representativeId?: string;
    nid?: string;
    lang?: "bn" | "en";
    match?: FaceMatchPayload | null;
  }) {
    const lang = opts.lang ?? "bn";
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const rep = await prismaRead.representative.findFirst({
      where: opts.representativeId
        ? { id: opts.representativeId }
        : opts.nid
          ? { nid: opts.nid }
          : undefined,
      include: {
        adminUnit: { select: { id: true, name: true, nameBn: true } },
        kpiRecords: {
          where: { recordedAt: { gte: since } },
          orderBy: { recordedAt: "desc" },
          take: 40,
          include: { kpiDef: { select: { code: true, name: true, nameBn: true } } },
        },
      },
    });

    if (!rep) {
      return null;
    }

    const [alerts, overrunProjects, liveSignals, grievanceArticles] = await Promise.all([
      prismaRead.redFlagAlert.findMany({
        where: {
          createdAt: { gte: since },
          project: { adminUnitId: rep.adminUnitId },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 25,
        include: { project: { select: { title: true, budgetAllocated: true, budgetSpent: true } } },
      }),
      prismaRead.project.findMany({
        where: {
          adminUnitId: rep.adminUnitId,
          updatedAt: { gte: since },
        },
        take: 40,
        select: {
          id: true,
          title: true,
          budgetAllocated: true,
          budgetSpent: true,
          status: true,
        },
      }),
      prismaRead.liveSignal.findMany({
        where: {
          OR: [
            { adminUnitId: rep.adminUnitId },
            { signalType: "REPRESENTATIVE" },
          ],
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          signalType: true,
          severity: true,
          flagType: true,
          url: true,
          createdAt: true,
        },
      }),
      prismaRead.externalArticle.findMany({
        where: {
          sentimentCategory: "Grievance",
          fetchedAt: { gte: since },
        },
        orderBy: { fetchedAt: "desc" },
        take: 15,
        select: { id: true, title: true, url: true, district: true, fetchedAt: true },
      }),
    ]);

    const openAlerts = alerts.filter((a) => !a.resolvedAt);
    const financialFlags = alerts.filter((a) =>
      ["BUDGET_OVERRUN", "CORRUPTION_RISK", "CONTRACTOR_FRAUD"].includes(a.flagType),
    );

    const overruns = overrunProjects.filter((p) => {
      const allocated = Number(p.budgetAllocated);
      const spent = Number(p.budgetSpent);
      return allocated > 0 && spent > allocated * 1.05;
    });

    const grievanceKpis = rep.kpiRecords.filter((k) =>
      k.kpiDef.code.toLowerCase().includes("grievance"),
    );
    const completionKpis = rep.kpiRecords.filter((k) =>
      /completion|project/i.test(k.kpiDef.code),
    );
    const latestGrievance =
      grievanceKpis.length > 0 ? Number(grievanceKpis[0]!.value) : 70;
    const latestCompletion =
      completionKpis.length > 0 ? Number(completionKpis[0]!.value) : 65;

    let ethical = 55;
    ethical += Math.min(20, (latestGrievance / 100) * 18);
    ethical += Math.min(15, (latestCompletion / 100) * 14);
    ethical -= openAlerts.length * 5;
    ethical -= financialFlags.length * 3;
    ethical -= overruns.length * 4;
    ethical = Math.max(5, Math.min(98, Math.round(ethical)));

    const allegations: string[] = [];
    for (const a of alerts.slice(0, 8)) {
      const text =
        a.aiExplanation?.trim() ||
        `${a.flagType} · ${a.project.title} (severity ${a.severity})`;
      if (text && !allegations.includes(text)) allegations.push(text);
    }
    for (const p of overruns.slice(0, 3)) {
      const allocated = Number(p.budgetAllocated);
      const spent = Number(p.budgetSpent);
      const pct = Math.round(((spent - allocated) / allocated) * 100);
      allegations.push(`Budget overrun ${pct}% — ${p.title}`);
    }
    for (const g of grievanceArticles.slice(0, 3)) {
      allegations.push(`News grievance: ${g.title}`);
    }

    const designation = lang === "bn" ? roleLabelBn(rep.role) : rep.role.replace(/_/g, " ");

    return {
      vip_name: rep.name,
      designation,
      ethical_score: ethical,
      red_flags_count: openAlerts.length,
      key_allegations: allegations.slice(0, 10),
      representative_id: rep.id,
      nid: rep.nid,
      designation_bn: roleLabelBn(rep.role),
      party: rep.party,
      window_days: 180,
      public_activity_count: liveSignals.length,
      complaint_proxy_count: grievanceArticles.length + grievanceKpis.length,
      match: opts.match ?? null,
      explanation:
        lang === "en"
          ? `${rep.name}: ethical score ${ethical}/100 over 6 months — ${openAlerts.length} open red flags, ${overruns.length} budget overruns, ${liveSignals.length} public signals.`
          : `${rep.name}: গত ৬ মাসের ethical স্কোর ${ethical}/১০০ — ${openAlerts.length}টি উন্মুক্ত রেড ফ্ল্যাগ, ${overruns.length}টি বাজেট overrun, ${liveSignals.length}টি পাবলিক সিগন্যাল।`,
      explanation_bn: `${rep.name}: গত ৬ মাসের ethical স্কোর ${ethical}/১০০ — ${openAlerts.length}টি উন্মুক্ত রেড ফ্ল্যাগ।`,
    };
  }

  async estimateCrowd(body: { image_base64: string; note?: string }) {
    const res = await fetchAi(`/api/v1/local-ai/crowd-estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: body.image_base64,
        note: body.note,
      }),
    });
    if (!res.ok) {
      return {
        faceCount: 0,
        densityBand: "LOW" as const,
        noteEn: "Crowd estimate unavailable.",
        noteBn: "ভিড় অনুমান পাওয়া যায়নি।",
        faceBoxes: [] as number[][],
        engine: "haar",
      };
    }
    const data = (await res.json()) as {
      face_count?: number;
      density_band?: string;
      note_en?: string;
      note_bn?: string;
      face_boxes?: number[][];
      engine?: string;
    };
    const band = data.density_band;
    return {
      faceCount: Number(data.face_count ?? 0),
      densityBand:
        band === "HIGH" || band === "MEDIUM" || band === "LOW" ? band : "LOW",
      noteEn: String(data.note_en ?? ""),
      noteBn: String(data.note_bn ?? ""),
      faceBoxes: Array.isArray(data.face_boxes) ? data.face_boxes : [],
      engine: String(data.engine ?? "haar"),
    };
  }

  async identifyFaceIntel(body: {
    image_base64?: string;
    nid?: string;
    threshold?: number;
    demo_fallback?: boolean;
    lang?: "bn" | "en";
  }) {
    const matched = await this.matchFaceIntel(body);
    const m = matched.match;
    if (!m?.matched || (!m.representative_id && !m.nid)) {
      return {
        matched: false,
        match: m,
        gallery_size: matched.gallery_size,
        vip_name: null,
        designation: null,
        ethical_score: null,
        red_flags_count: null,
        key_allegations: [] as string[],
        message: "No VIP match — enroll face or try sample portrait / NID lookup.",
      };
    }

    const card = await this.buildEthicalReportCard({
      representativeId: m.representative_id ?? undefined,
      nid: m.nid ?? undefined,
      lang: body.lang ?? "bn",
      match: m,
    });

    if (!card) {
      // Gallery hit but DB rep missing — still return structured skeleton
      return {
        matched: true,
        match: m,
        gallery_size: matched.gallery_size,
        vip_name: m.nid ?? "VIP",
        designation: "Representative",
        ethical_score: 50,
        red_flags_count: 0,
        key_allegations: ["Representative profile not found in SQL — seed data required"],
        message: "Matched gallery VIP but Prisma representative missing",
      };
    }

    return {
      matched: true,
      gallery_size: matched.gallery_size,
      ...card,
    };
  }

  async getHazardOverlay(
    query: DashboardScopeQuery = {},
    season = "monsoon",
    lookbackDays = 1,
  ) {
    const unitId = scopeUnitId(query);
    const windowDays = [1, 7, 30].includes(lookbackDays) ? lookbackDays : 1;

    const STATIC_ZONES: HazardZoneRecord[] = allStaticHazardZones().map((z) => ({
      zone_id: z.zone_id,
      name: z.name,
      name_bn: z.name_bn,
      hazard_type: z.hazard_type,
      risk_level: z.risk_level,
      division: z.division,
      district: z.district,
      locality: z.locality,
      locality_bn: z.locality_bn,
      lat: z.lat,
      lng: z.lng,
      radius_km: z.radius_km,
      water_note_bn: z.water_note_bn,
      water_note_en: z.water_note_en,
      scale: z.radius_km <= 12 ? "local" : "regional",
      source: "static_local_hotspot",
    }));

    const projects = await prismaRead.project.findMany({
      where: {
        status: { in: [ProjectStatus.ONGOING, ProjectStatus.PLANNED] },
        ...(unitId && { adminUnitId: unitId }),
      },
      select: {
        id: true,
        title: true,
        status: true,
        adminUnit: {
          select: { name: true, geoJson: true, divisionId: true },
        },
      },
      take: 100,
    });

    const projectInputs = projects.map((p) => {
      const geo = p.adminUnit.geoJson as { coordinates?: [number, number] } | null;
      const lng = geo?.coordinates?.[0] ?? 90.35;
      const lat = geo?.coordinates?.[1] ?? 23.68;
      return {
        project_id: p.id,
        title: p.title,
        status: p.status,
        lat,
        lng,
        division: p.adminUnit.name,
      };
    });

    const res = await fetchAi(`/api/v1/hazards/overlay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zones: STATIC_ZONES,
        projects: projectInputs,
        season,
      }),
    });
    if (!res.ok) throw new Error("Hazard overlay unavailable");
    const overlay = (await res.json()) as Record<string, unknown>;

    const { pipelineService } = await import("../pipeline/pipeline.service");
    const liveSignals = await pipelineService.getHazardSignals();
    const dynamicZones =
      liveSignals && Array.isArray(liveSignals.signals)
        ? (liveSignals.signals as Array<{
            zone_id: string;
            hazard_type: string;
            risk_level: number;
            division: string;
            article_count: number;
          }>).map((s) => ({
            zone_id: s.zone_id,
            name: `Live ${s.hazard_type} — ${s.division}`,
            name_bn: `লাইভ ${s.hazard_type === "flood" ? "বন্যা" : "ঘূর্ণিঝড়"} — ${s.division}`,
            hazard_type: s.hazard_type,
            risk_level: s.risk_level,
            division: s.division,
            lat:
              STATIC_ZONES.find(
                (z) =>
                  normalizeDivisionName(z.division) === normalizeDivisionName(s.division) &&
                  z.scale === "regional",
              )?.lat ??
              STATIC_ZONES.find(
                (z) => normalizeDivisionName(z.division) === normalizeDivisionName(s.division),
              )?.lat ??
              23.68,
            lng:
              STATIC_ZONES.find(
                (z) =>
                  normalizeDivisionName(z.division) === normalizeDivisionName(s.division) &&
                  z.scale === "regional",
              )?.lng ??
              STATIC_ZONES.find(
                (z) => normalizeDivisionName(z.division) === normalizeDivisionName(s.division),
              )?.lng ??
              90.35,
            radius_km: Math.min(28, 18 + s.article_count * 4),
            scale: "regional",
            source: "news_pipeline",
          }))
        : [];

    let weatherLive: Record<string, unknown> | null = null;
    const scopeCtx = await resolveScopeContext(query);
    try {
      const { weatherService } = await import("../weather/weather.service");
      weatherLive = (await weatherService.getLive(query)) as unknown as Record<string, unknown>;
    } catch {
      weatherLive = null;
    }

    const [weatherPeaks, newsLocalityHits] = await Promise.all([
      fetchWeatherPeaksForWindow(windowDays),
      fetchNewsLocalitiesForWindow(windowDays),
    ]);

    const staticLocalityKeys = new Set(
      STATIC_ZONES.filter((z) => z.scale === "local").flatMap((z) => [
        normKey(z.locality),
        normKey(z.locality_bn),
      ]),
    );

    const weatherZones = weatherPeaks
      .map((peak) => ({ peak, zone: weatherPeakToZone(peak, windowDays) }))
      .filter((row): row is { peak: (typeof weatherPeaks)[number]; zone: NonNullable<ReturnType<typeof weatherPeakToZone>> } => row.zone !== null)
      .filter(({ peak }) => {
        const nameKey = normKey(peak.name_bn);
        return !staticLocalityKeys.has(nameKey);
      })
      .map(({ zone }) => zone as HazardZoneRecord);

    const activeStaticZones = STATIC_ZONES.filter((z) => {
      const weatherPeak = findWeatherPeakForZone(z, weatherPeaks);
      const newsHit = findNewsHitForZone(z, newsLocalityHits);
      return zoneHasWindowEvidence(z, weatherPeak, newsHit, windowDays);
    }).map((z) => {
      const weatherPeak = findWeatherPeakForZone(z, weatherPeaks);
      const newsHit = findNewsHitForZone(z, newsLocalityHits);
      const evidenceNoteBn = newsHit
        ? `সংবাদে ${newsHit.article_count}টি উল্লেখ (${windowDays} দিন)`
        : weatherPeak
          ? `${windowDays} দিনে সর্বোচ্চ বন্যা ঝুঁকি ${weatherPeak.max_flood_risk}/৫`
          : z.water_note_bn;
      const evidenceNoteEn = newsHit
        ? `${newsHit.article_count} news mention(s) in ${windowDays}d`
        : weatherPeak
          ? `Peak flood risk ${weatherPeak.max_flood_risk}/5 in ${windowDays}d`
          : z.water_note_en;
      return {
        ...z,
        risk_level: Math.max(
          z.risk_level,
          weatherPeak?.max_flood_risk ?? 0,
          weatherPeak?.max_cyclone_risk ?? 0,
          newsHit ? 3 : 0,
        ),
        water_note_bn: evidenceNoteBn,
        water_note_en: evidenceNoteEn,
        source: newsHit ? "news_window" : weatherPeak ? "open-meteo-window" : z.source,
      };
    });

    const allZones = [
      ...weatherZones,
      ...dynamicZones,
      ...activeStaticZones,
    ].filter((z) =>
      matchesScopeDistrict(
        "district" in z && typeof (z as HazardZoneRecord).district === "string"
          ? (z as HazardZoneRecord).district!
          : null,
        z.division,
        scopeCtx,
      ),
    );

    return {
      ...overlay,
      zones: allZones,
      lookback_days: windowDays,
      live_signals: liveSignals?.signals ?? [],
      weather: weatherLive,
      scope: scopeCtx,
      projects_mapped: projectInputs.length,
      data_source:
        weatherZones.length > 0
          ? "open-meteo-window"
          : activeStaticZones.some((z) => z.source === "news_window")
            ? "news_window"
            : dynamicZones.length > 0
              ? "news_rss_google"
              : "window_filtered",
    };
  }
}

export const intelligenceService = new IntelligenceService();
