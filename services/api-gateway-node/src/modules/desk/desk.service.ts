import {
  AlertDeliveryStatus,
  ComplaintStatus,
  IntelSnapshotKind,
  LocalIntegrityDomain,
  LocalIntegrityStatus,
  LocalSector,
  LocalSiteStatus,
  LocalOsintSentiment,
  LocalVisitStatus,
  NarrativeSignalStatus,
  NarrativeThreatLevel,
  ProjectStatus,
  ServiceOutageStatus,
  SpecialtySignalStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { isLocalEntityRole } from "../../core/constants/rbac";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { LOCAL_ENTITY_CODES } from "../local-entity/local-entity.catalog";

const TTL_SEC = 20;

export type NavPulseStatus = "OK" | "WATCH" | "ALERT";

export type NavPulseItem = {
  key: string;
  href: string;
  status: NavPulseStatus;
  count: number;
  headline: string;
  headlineBn: string;
};

export type DeskDueAction = {
  id: string;
  en: string;
  bn: string;
};

export type NavPulse = {
  generatedAt: string;
  role: UserRole;
  pipelineAt: string | null;
  pipelineOk: boolean;
  dueActions: DeskDueAction[];
  items: NavPulseItem[];
};

type UserScope = { role: UserRole; adminUnitId: string | null };

let mem: { key: string; exp: number; data: NavPulse } | null = null;

function cacheKey(user: UserScope): string {
  return `desk:nav-pulse:v1:${user.role}:${user.adminUnitId ?? "national"}`;
}

async function readCache(key: string): Promise<NavPulse | null> {
  if (mem && mem.key === key && mem.exp > Date.now()) return mem.data;
  if (!isRedisEnabled()) return null;
  try {
    const raw = await getRedisClient().get(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as NavPulse;
    if (!Array.isArray(data?.items)) return null;
    mem = { key, exp: Date.now() + TTL_SEC * 1000, data };
    return data;
  } catch {
    return null;
  }
}

async function writeCache(key: string, data: NavPulse): Promise<void> {
  mem = { key, exp: Date.now() + TTL_SEC * 1000, data };
  if (!isRedisEnabled()) return;
  try {
    await getRedisClient().setex(key, TTL_SEC, JSON.stringify(data));
  } catch {
    /* in-process cache still holds */
  }
}

function item(
  key: string,
  href: string,
  count: number,
  alertAt: number,
  watchAt: number,
  headline: string,
  headlineBn: string,
): NavPulseItem {
  const status: NavPulseStatus =
    count >= alertAt ? "ALERT" : count >= watchAt ? "WATCH" : "OK";
  return { key, href, status, count, headline, headlineBn };
}

function liveItem(
  key: string,
  href: string,
  count: number,
  headline: string,
  headlineBn: string,
): NavPulseItem {
  return { key, href, status: count > 0 ? "WATCH" : "OK", count, headline, headlineBn };
}

export class DeskService {
  async getNavPulse(user: UserScope): Promise<NavPulse> {
    if (isLocalEntityRole(user.role) && !user.adminUnitId) {
      throw ApiError.forbidden("Local role missing admin unit scope");
    }

    const key = cacheKey(user);
    const cached = await readCache(key);
    if (cached) return cached;

    const data = isLocalEntityRole(user.role)
      ? await this.localPulse(user)
      : await this.nationalPulse(user);

    await writeCache(key, data);
    return data;
  }

  private async pipelineMeta() {
    const last = await prismaRead.pipelineJobRun.findFirst({
      orderBy: { completedAt: "desc" },
      select: { ok: true, completedAt: true, job: true },
    });
    return {
      pipelineAt: last?.completedAt.toISOString() ?? null,
      pipelineOk: last?.ok ?? true,
    };
  }

  private async nationalPulse(user: UserScope): Promise<NavPulse> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pipeline,
      openAlerts,
      stalledProjects,
      sectorGroups,
      disasters,
      narrativeHot,
      weatherHot,
      kpiFresh,
      agroRows,
      reps,
      auditRecent,
      briefingSnap,
      localSeatIds,
    ] = await Promise.all([
      this.pipelineMeta(),
      prismaRead.redFlagAlert.count({ where: { resolvedAt: null } }),
      prismaRead.project.count({ where: { status: ProjectStatus.STALLED } }),
      prismaRead.nationalSectorSnapshot.groupBy({
        by: ["sector"],
        where: { status: LocalSiteStatus.ALERT },
        _count: { id: true },
      }),
      prismaRead.disasterAlert.count({ where: { isActive: true, severity: { gte: 3 } } }),
      prismaRead.narrativeSignal.count({
        where: {
          status: NarrativeSignalStatus.ACTIVE,
          threatLevel: { in: [NarrativeThreatLevel.CRITICAL, NarrativeThreatLevel.HIGH] },
        },
      }),
      prismaRead.weatherObservation.count({
        where: { recordedAt: { gte: since24h }, OR: [{ floodRisk: { gte: 60 } }, { cycloneRisk: { gte: 60 } }] },
      }),
      prismaRead.kpiRecord.count({ where: { recordedAt: { gte: since24h } } }),
      prismaRead.agroMarket.count(),
      prismaRead.representative.count(),
      prismaRead.auditLog.count({ where: { createdAt: { gte: since24h } } }),
      prismaRead.intelAnalysisSnapshot.findFirst({
        where: { kind: IntelSnapshotKind.BRIEFING },
        orderBy: { generatedAt: "desc" },
        select: { generatedAt: true },
      }),
      prismaRead.adminUnit.findMany({
        where: { code: { in: [...LOCAL_ENTITY_CODES] } },
        select: { id: true },
      }),
    ]);

    const edu = sectorGroups.find((g) => g.sector === LocalSector.EDUCATION)?._count.id ?? 0;
    const health = sectorGroups.find((g) => g.sector === LocalSector.HEALTH)?._count.id ?? 0;
    const jobs = sectorGroups.find((g) => g.sector === LocalSector.EMPLOYMENT)?._count.id ?? 0;
    const sectorAlerts = edu + health + jobs;
    const seatIds = localSeatIds.map((u) => u.id);
    const localAlertSites = seatIds.length
      ? await prismaRead.localSectorSite.count({
          where: { entityId: { in: seatIds }, status: LocalSiteStatus.ALERT },
        })
      : 0;

    const dueActions: DeskDueAction[] = [];
    if (openAlerts > 0) {
      dueActions.push({
        id: "national-alerts",
        en: `${openAlerts} open red-flag alerts remain on the national board.`,
        bn: `জাতীয় বোর্ডে ${openAlerts}টি খোলা রেড-ফ্ল্যাগ সতর্কতা আছে।`,
      });
    }
    if (sectorAlerts > 0) {
      dueActions.push({
        id: "national-sectors",
        en: `Education ${edu}, health ${health}, jobs ${jobs} district alerts — compare divisions, do not dispatch wards.`,
        bn: `শিক্ষা ${edu}, স্বাস্থ্য ${health}, কর্মসংস্থান ${jobs} জেলা সতর্কতা — বিভাগ তুলনা করুন, ওয়ার্ড ডিসপ্যাচ নয়।`,
      });
    }

    const items: NavPulseItem[] = [
      item("nationalOverview", "/", openAlerts, 8, 1, `${openAlerts} open national alerts`, `${openAlerts}টি খোলা জাতীয় সতর্কতা`),
      liveItem(
        "briefing",
        "/briefing",
        briefingSnap ? 1 : 0,
        "Morning briefing snapshot ready",
        "সকালের ব্রিফিং প্রস্তুত",
      ),
      item("narrativeShield", "/narrative-shield", narrativeHot, 5, 1, `${narrativeHot} high-threat narratives`, `${narrativeHot}টি উচ্চ হুমকির বয়ান`),
      liveItem("outlook", "/outlook", 1, "Strategic outlook on pipeline", "কৌশলগত আউটলুক পাইপলাইনে"),
      item("unrest", "/unrest", openAlerts, 10, 2, `${openAlerts} unresolved pressure flags`, `${openAlerts}টি অমীমাংসিত চাপ`),
      item("divisionalCrisis", "/divisional-crisis", disasters + weatherHot, 3, 1, `${disasters + weatherHot} hazard/crisis signals`, `${disasters + weatherHot}টি দুর্যোগ/সংকট সংকেত`),
      item(
        "nationalSectors",
        "/sectors",
        sectorAlerts,
        8,
        1,
        `Education ${edu} · health ${health} · jobs ${jobs} district alerts`,
        `শিক্ষা ${edu} · স্বাস্থ্য ${health} · কর্মসংস্থান ${jobs} জেলা সতর্কতা`,
      ),
      liveItem("antiPhishing", "/anti-phishing", 1, "Official-domain catalogue live", "সরকারি ডোমেইন তালিকা চালু"),
      item("hazards", "/hazards", disasters + weatherHot, 3, 1, `${disasters} active disaster alerts`, `${disasters}টি সক্রিয় দুর্যোগ সতর্কতা`),
      liveItem("agro", "/agro", agroRows, `${agroRows} market rows`, `${agroRows}টি বাজার সারি`),
      liveItem("procurement", "/procurement", stalledProjects, `${stalledProjects} stalled projects`, `${stalledProjects}টি স্থবির প্রকল্প`),
      liveItem("kpis", "/kpis", kpiFresh, `${kpiFresh} KPI points in 24h`, `২৪ ঘণ্টায় ${kpiFresh}টি কেপিআই`),
      item("projects", "/projects", stalledProjects, 4, 1, `${stalledProjects} stalled projects`, `${stalledProjects}টি স্থবির প্রকল্প`),
      item("alerts", "/alerts", openAlerts, 8, 1, `${openAlerts} open alerts`, `${openAlerts}টি খোলা সতর্কতা`),
      liveItem("documents", "/documents", 1, "Document desk ready", "নথি ডেস্ক প্রস্তুত"),
      liveItem("auditTrail", "/audit-trail", auditRecent, `${auditRecent} audit events in 24h`, `২৪ ঘণ্টায় ${auditRecent}টি অডিট`),
      item("notifications", "/notifications", openAlerts, 8, 1, `${openAlerts} unread-capable alerts`, `${openAlerts}টি সতর্কতা`),
      liveItem("representatives", "/representatives", reps, `${reps} representatives`, `${reps} জন প্রতিনিধি`),
      liveItem("faceIntel", "/face-intel", 1, "Gallery endpoint live", "গ্যালারি এন্ডপয়েন্ট চালু"),
      item("localEntity", "/local", localAlertSites, 6, 1, `${localAlertSites} Local DSS site alerts`, `${localAlertSites}টি লোকাল ডিএসএস সাইট সতর্কতা`),
    ];

    if (user.role !== UserRole.PMO && user.role !== UserRole.MINISTER) {
      const hide = new Set(["nationalSectors", "localEntity", "faceIntel", "divisionalCrisis"]);
      return {
        generatedAt: new Date().toISOString(),
        role: user.role,
        ...pipeline,
        dueActions,
        items: items.filter((row) => !hide.has(row.key)),
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      role: user.role,
      ...pipeline,
      dueActions,
      items,
    };
  }

  private async localPulse(user: UserScope): Promise<NavPulse> {
    const entityId = user.adminUnitId!;
    const now = new Date();
    const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const [
      pipeline,
      openComplaints,
      overdue,
      redAlerts,
      outages,
      visits,
      wpiLow,
      osintHot,
      pulseOpen,
      eduAlert,
      healthAlert,
      jobsAlert,
      crimeOpen,
      corrOpen,
      specialtyAlert,
      failedDeliveries,
      evidence,
      budgetProjects,
    ] = await Promise.all([
      this.pipelineMeta(),
      prismaRead.citizenComplaint.count({
        where: { entityId, status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] } },
      }),
      prismaRead.citizenComplaint.count({
        where: {
          entityId,
          resolvedAt: null,
          slaDeadline: { lt: now },
          status: { not: ComplaintStatus.RESOLVED },
        },
      }),
      prismaRead.citizenComplaint.count({
        where: { entityId, isRedAlert: true, status: { not: ComplaintStatus.RESOLVED } },
      }),
      prismaRead.localServiceOutage.count({
        where: { entityId, status: { in: [ServiceOutageStatus.ACTIVE, ServiceOutageStatus.WATCH] } },
      }),
      prismaRead.localVisitPlan.count({ where: { entityId, status: LocalVisitStatus.PLANNED } }),
      prismaRead.wardPerformanceScore.count({
        where: { entityId, periodKey, score: { lt: 55 } },
      }),
      prismaRead.localOsintHit.count({
        where: { entityId, OR: [{ propagandaFlag: true }, { sentiment: LocalOsintSentiment.NEGATIVE }] },
      }),
      prismaRead.localPulseEvent.count({ where: { entityId, done: false } }),
      prismaRead.localSectorSite.count({
        where: { entityId, sector: LocalSector.EDUCATION, status: LocalSiteStatus.ALERT },
      }),
      prismaRead.localSectorSite.count({
        where: { entityId, sector: LocalSector.HEALTH, status: LocalSiteStatus.ALERT },
      }),
      prismaRead.localSectorSite.count({
        where: { entityId, sector: LocalSector.EMPLOYMENT, status: LocalSiteStatus.ALERT },
      }),
      prismaRead.localIntegrityIncident.count({
        where: { entityId, domain: LocalIntegrityDomain.CRIME, status: { not: LocalIntegrityStatus.CLOSED } },
      }),
      prismaRead.localIntegrityIncident.count({
        where: { entityId, domain: LocalIntegrityDomain.CORRUPTION, status: { not: LocalIntegrityStatus.CLOSED } },
      }),
      prismaRead.localSpecialtySignal.count({
        where: { entityId, status: SpecialtySignalStatus.ALERT },
      }),
      prismaRead.alertDeliveryLog.count({
        where: { entityId, status: { in: [AlertDeliveryStatus.QUEUED, AlertDeliveryStatus.FAILED] } },
      }),
      prismaRead.localEvidenceItem.count({ where: { entityId: entityId } }),
      prismaRead.project.count({
        where: { adminUnitId: entityId, status: { in: [ProjectStatus.ONGOING, ProjectStatus.STALLED] } },
      }),
    ]);

    const dueActions: DeskDueAction[] = [];
    if (overdue > 0) {
      dueActions.push({
        id: "sla",
        en: `${overdue} complaints past 24h SLA — assign or close today.`,
        bn: `${overdue}টি অভিযোগ ২৪ ঘণ্টার এসএলএ পেরিয়েছে — আজই অ্যাসাইন বা বন্ধ করুন।`,
      });
    }
    if (failedDeliveries > 0) {
      dueActions.push({
        id: "delivery",
        en: `${failedDeliveries} WhatsApp/voice deliveries queued or failed — pipeline retries them.`,
        bn: `${failedDeliveries}টি হোয়াটসঅ্যাপ/ভয়েস ডেলিভারি কিউ বা ব্যর্থ — পাইপলাইন আবার চেষ্টা করছে।`,
      });
    }
    if (redAlerts > 0) {
      dueActions.push({
        id: "red",
        en: `${redAlerts} red-alert complaints still open.`,
        bn: `${redAlerts}টি রেড-অ্যালার্ট অভিযোগ এখনও খোলা।`,
      });
    }

    const commandHeat = eduAlert + healthAlert + jobsAlert + crimeOpen + outages;
    const fieldHeat = openComplaints + outages + redAlerts;

    const items: NavPulseItem[] = [
      item("localEntity", "/local", fieldHeat, 8, 1, `${openComplaints} open complaints · ${outages} outages`, `${openComplaints}টি খোলা অভিযোগ · ${outages}টি বিঘ্ন`),
      item("localField", "/local/field", fieldHeat, 8, 1, `${fieldHeat} field pressure points`, `${fieldHeat}টি ফিল্ড চাপ`),
      item("localComplaints", "/local/complaints", overdue + redAlerts, 3, 1, `${overdue} overdue · ${redAlerts} red`, `${overdue}টি ওভারডিউ · ${redAlerts}টি রেড`),
      item("localHeatmap", "/local/heatmap", fieldHeat + osintHot, 10, 2, `${fieldHeat} ops + ${osintHot} OSINT flags`, `${fieldHeat} অপস + ${osintHot} ওএসআইএনটি`),
      item("localVisits", "/local/visits", visits, 4, 1, `${visits} planned visits`, `${visits}টি পরিকল্পিত সফর`),
      item("localWpi", "/local/wpi", wpiLow, 2, 1, `${wpiLow} wards below WPI 55`, `ডব্লিউপিআই ৫৫-এর নিচে ${wpiLow}টি ওয়ার্ড`),
      item("localScorecard", "/local/scorecard", wpiLow, 2, 1, `${wpiLow} weak scorecard wards`, `${wpiLow}টি দুর্বল স্কোরকার্ড ওয়ার্ড`),
      liveItem("localBudget", "/local/budget", budgetProjects, `${budgetProjects} active local projects`, `${budgetProjects}টি চলমান স্থানীয় প্রকল্প`),
      item("localOsint", "/local/osint", osintHot, 6, 1, `${osintHot} negative/propaganda hits`, `${osintHot}টি নেতিবাচক/প্রোপাগান্ডা`),
      item("localPulse", "/local/pulse", pulseOpen, 4, 1, `${pulseOpen} open pulse events`, `${pulseOpen}টি খোলা পালস ইভেন্ট`),
      liveItem("localEvidence", "/local/evidence", evidence, `${evidence} evidence abstracts`, `${evidence}টি প্রমাণ সারাংশ`),
      item("localEducation", "/local/education", eduAlert, 2, 1, `${eduAlert} school-site alerts`, `${eduAlert}টি স্কুল সাইট সতর্কতা`),
      item("localHealth", "/local/health", healthAlert, 2, 1, `${healthAlert} clinic-site alerts`, `${healthAlert}টি ক্লিনিক সাইট সতর্কতা`),
      item("localJobs", "/local/jobs", jobsAlert, 2, 1, `${jobsAlert} employment-site alerts`, `${jobsAlert}টি কর্মসংস্থান সাইট সতর্কতা`),
      item("localCrime", "/local/crime", crimeOpen, 3, 1, `${crimeOpen} open crime incidents`, `${crimeOpen}টি খোলা অপরাধ ঘটনা`),
      item("localCorruption", "/local/corruption", corrOpen, 2, 1, `${corrOpen} open integrity flags`, `${corrOpen}টি খোলা অখণ্ডতা ফ্ল্যাগ`),
      item("localCommand", "/local/command", commandHeat, 8, 2, `${commandHeat} command-room pressure`, `${commandHeat}টি কমান্ড-রুম চাপ`),
      item("localSpecialty", "/local/specialty", specialtyAlert, 2, 1, `${specialtyAlert} specialty alerts`, `${specialtyAlert}টি স্পেশালিটি সতর্কতা`),
      item("localOutage", "/local/outage", outages, 2, 1, `${outages} active/watch outages`, `${outages}টি সক্রিয়/নজরদারি বিঘ্ন`),
      item("localAlerts", "/local/alerts", failedDeliveries + redAlerts, 2, 1, `${failedDeliveries} delivery retries · ${redAlerts} red`, `${failedDeliveries}টি ডেলিভারি রিট্রাই · ${redAlerts}টি রেড`),
      liveItem("localSecurity", "/local/security", 1, "Desk security settings ready", "ডেস্ক নিরাপত্তা সেটিংস প্রস্তুত"),
    ];

    return {
      generatedAt: new Date().toISOString(),
      role: user.role,
      ...pipeline,
      dueActions,
      items,
    };
  }
}

export const deskService = new DeskService();
