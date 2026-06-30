import { ProjectStatus, RedFlagType } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { publishToGovQueue } from "../../infrastructure/messaging/gov-queue.publisher";
import { hashAiExplanation } from "../twin/twin.service";
import { auditService } from "../../shared/audit/audit.service";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";

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

export class IntelligenceService {
  async getSentimentHeatmap(level: "district" | "upazila" = "district", limit = 100) {
    const res = await fetch(
      `${env.AI_SERVICE_URL}/api/v1/sentiment/heatmap?level=${level}&limit=${limit}`,
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

    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/predictive/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiInput),
    });
    if (!res.ok) throw new Error("Predictive scoring unavailable");
    const aiResult = (await res.json()) as { scores: PredictiveScore[]; scanned_at: string };

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
    const reps = await prismaRead.representative.findMany({
      where: unitId ? { adminUnitId: unitId } : undefined,
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

    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/accountability/score`, {
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
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/documents/analyze`, {
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

  async getHazardOverlay(query: DashboardScopeQuery = {}, season = "monsoon") {
    const unitId = scopeUnitId(query);

    const STATIC_ZONES = [
      {
        zone_id: "flood-barishal",
        name: "Barishal Coastal Flood Plain",
        name_bn: "বরিশাল উপকূলীয় বন্যা অঞ্চল",
        hazard_type: "flood",
        risk_level: 4,
        division: "Barishal",
        lat: 22.7,
        lng: 90.35,
        radius_km: 80,
      },
      {
        zone_id: "cyclone-chattogram",
        name: "Chattogram Cyclone Corridor",
        name_bn: "চট্টগ্রাম ঘূর্ণিঝড় করিডোর",
        hazard_type: "cyclone",
        risk_level: 5,
        division: "Chattogram",
        lat: 22.35,
        lng: 91.78,
        radius_km: 100,
      },
      {
        zone_id: "flood-sylhet",
        name: "Sylhet Haor Flood Zone",
        name_bn: "সিলেট হাওর বন্যা অঞ্চল",
        hazard_type: "flood",
        risk_level: 4,
        division: "Sylhet",
        lat: 24.9,
        lng: 91.87,
        radius_km: 70,
      },
      {
        zone_id: "flood-dhaka",
        name: "Dhaka Peripheral Flood Risk",
        name_bn: "ঢাকা পেরিফেরাল বন্যা ঝুঁকি",
        hazard_type: "flood",
        risk_level: 3,
        division: "Dhaka",
        lat: 23.85,
        lng: 90.25,
        radius_km: 45,
      },
    ];

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

    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/hazards/overlay`, {
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

    return {
      ...overlay,
      zones: STATIC_ZONES,
      projects_mapped: projectInputs.length,
    };
  }
}

export const intelligenceService = new IntelligenceService();
