import { AdminUnitType, EvidenceGeoScope, LocalSector, LocalSiteStatus, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";

const CACHE_KEY = "national:sectors:v1";
const TTL_SEC = 60;

export type NationalSectorCode = "EDUCATION" | "HEALTH" | "EMPLOYMENT";

export type OpsHint = { horizon: "0-24h"; en: string; bn: string };

export type NationalDistrictSlice = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  divisionId: string;
  divisionName: string;
  divisionNameBn: string | null;
  status: LocalSiteStatus;
  severity: number;
  pressure: number;
  metrics: Record<string, unknown>;
  opsHint: OpsHint;
};

export type NationalDivisionSlice = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  districts: number;
  alert: number;
  watch: number;
  ok: number;
  pressureAvg: number;
  attendanceAvg: number;
  dropoutAvg: number;
  teacherGap: number;
  dengue7d: number;
  occupancyAvg: number;
  stockouts: number;
  unemploymentAvg: number;
  youthUnempAvg: number;
  vacancies: number;
  trainingSeats: number;
  jobFairGaps: number;
  hotDistricts: Array<{ name: string; nameBn: string | null; pressure: number }>;
  opsHint: OpsHint;
};

export type NationalJobAction = {
  id: "JOB_FAIR" | "SKILL_TRAINING" | "VACANCY_DRIVE" | "RURAL_WORKS" | "INDUSTRY_LINK";
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
  targetDivisions: string[];
  affectedDistricts: number;
};

export type NationalSectorEvidence = {
  id: string;
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  sourceName: string;
  url: string;
  year: number;
  topics: string[];
  doNow: { en: string; bn: string };
};

export type NationalSectorBoard = {
  generatedAt: string;
  sourceNote: string;
  summary: {
    districts: number;
    divisions: number;
    educationAlerts: number;
    healthAlerts: number;
    jobsAlerts: number;
    attendanceAvg: number;
    teacherGap: number;
    dengue7d: number;
    stockouts: number;
    unemploymentAvg: number;
    jobFairGaps: number;
    vacancies: number;
    trainingSeats: number;
  };
  divisions: Array<{
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
    education: NationalDivisionSlice;
    health: NationalDivisionSlice;
    jobs: NationalDivisionSlice;
  }>;
  districts: {
    education: NationalDistrictSlice[];
    health: NationalDistrictSlice[];
    jobs: NationalDistrictSlice[];
  };
  jobActions: NationalJobAction[];
  evidence: NationalSectorEvidence[];
};

let mem: { exp: number; data: NationalSectorBoard } | null = null;

function num(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return Math.round(xs.reduce((s, n) => s + n, 0) / xs.length);
}

function pressureOf(sector: LocalSector, metrics: Record<string, unknown>): number {
  if (sector === LocalSector.EDUCATION) {
    return Math.min(
      100,
      num(metrics, "dropoutPct") * 3.2 +
        num(metrics, "teacherGap") * 8 +
        Math.max(0, 88 - num(metrics, "attendancePct")) * 1.1,
    );
  }
  if (sector === LocalSector.HEALTH) {
    return Math.min(
      100,
      num(metrics, "dengueCases7d") * 4.5 +
        Math.max(0, num(metrics, "occupancyPct") - 80) * 1.4 +
        (flag(metrics, "stockout") ? 22 : 0) +
        Math.max(0, 5 - num(metrics, "orsStockDays")) * 4,
    );
  }
  return Math.min(
    100,
    num(metrics, "unemploymentPct") * 2.2 +
      num(metrics, "youthUnempPct") * 0.8 +
      (flag(metrics, "jobFairGap") ? 16 : 0) +
      Math.max(0, 20 - num(metrics, "vacanciesListed")) * 1.2,
  );
}

function opsHint(sector: LocalSector, metrics: Record<string, unknown>): OpsHint {
  if (sector === LocalSector.EDUCATION) {
    if (num(metrics, "teacherGap") >= 4) {
      return {
        horizon: "0-24h",
        en: "Ask DPE for a same-week substitute list; SMC to cover doubled classes.",
        bn: "ডিপিই থেকে এক সপ্তাহের বিকল্প শিক্ষক তালিকা; দ্বিগুণ ক্লাসে এসএমসি কভার।",
      };
    }
    if (num(metrics, "dropoutPct") >= 14) {
      return {
        horizon: "0-24h",
        en: "Stipend / attendance drive this week; keep the school feeding point open.",
        bn: "এই সপ্তাহে উপবৃত্তি/উপস্থিতি ড্রাইভ; স্কুল ফিডিং পয়েন্ট খোলা রাখুন।",
      };
    }
    return {
      horizon: "0-24h",
      en: "Publish attendance and teacher-gap list at the DEO; generator cover for evening class.",
      bn: "ডিইওতে উপস্থিতি ও শিক্ষক ঘাটতির তালিকা; সন্ধ্যার ক্লাসে জেনারেটর।",
    };
  }
  if (sector === LocalSector.HEALTH) {
    if (num(metrics, "dengueCases7d") >= 12 || flag(metrics, "stockout")) {
      return {
        horizon: "0-24h",
        en: "Fever desk + larvicide in hot wards; ORS / paracetamol buffer to the civil surgeon.",
        bn: "হট ওয়ার্ডে জ্বর ডেস্ক + লার্ভিসাইড; সিভিল সার্জনের কাছে ORS/প্যারাসিটামল বাফার।",
      };
    }
    if (num(metrics, "occupancyPct") >= 90) {
      return {
        horizon: "0-24h",
        en: "Divert non-critical cases to the next district hospital; keep a 24h referral desk.",
        bn: "অজরুরি কেস পাশের জেলা হাসপাতালে পাঠান; ২৪ ঘণ্টা রেফারেল ডেস্ক রাখুন।",
      };
    }
    return {
      horizon: "0-24h",
      en: "Stock check at upazila stores; publish a same-day dengue / ORS note.",
      bn: "উপজেলা স্টোরে স্টক চেক; আজই ডেঙ্গু/ORS নোট প্রকাশ করুন।",
    };
  }
  if (num(metrics, "unemploymentPct") >= 14 || flag(metrics, "jobFairGap")) {
    return {
      horizon: "0-24h",
      en: "Announce a 7-day job fair with DYD / BSCIC; list public vacancies before Friday.",
      bn: "ডিওয়াইডি/বিসিক দিয়ে ৭ দিনের জব ফেয়ার; শুক্রবারের আগে সরকারি শূন্যপদ তালিকা।",
    };
  }
  if (num(metrics, "youthUnempPct") >= 22 && num(metrics, "trainingSeats") < 80) {
    return {
      horizon: "0-24h",
      en: "Open a TTC / short skill batch this month; reserve 30% seats for women.",
      bn: "এই মাসে টিটিসি/স্বল্পমেয়াদি স্কিল ব্যাচ; ৩০% আসন নারীদের জন্য।",
    };
  }
  return {
    horizon: "0-24h",
    en: "Employer roundtable + publish training-to-vacancy map at the DC office.",
    bn: "নিয়োগকর্তা রাউন্ডটেবিল + ডিসি অফিসে প্রশিক্ষণ-থেকে-শূন্যপদ ম্যাপ।",
  };
}

function emptyDivision(
  id: string,
  code: string,
  name: string,
  nameBn: string | null,
): NationalDivisionSlice {
  return {
    id,
    code,
    name,
    nameBn,
    districts: 0,
    alert: 0,
    watch: 0,
    ok: 0,
    pressureAvg: 0,
    attendanceAvg: 0,
    dropoutAvg: 0,
    teacherGap: 0,
    dengue7d: 0,
    occupancyAvg: 0,
    stockouts: 0,
    unemploymentAvg: 0,
    youthUnempAvg: 0,
    vacancies: 0,
    trainingSeats: 0,
    jobFairGaps: 0,
    hotDistricts: [],
    opsHint: { horizon: "0-24h", en: "", bn: "" },
  };
}

function rollDivision(
  meta: { id: string; code: string; name: string; nameBn: string | null },
  sector: LocalSector,
  rows: NationalDistrictSlice[],
): NationalDivisionSlice {
  const out = emptyDivision(meta.id, meta.code, meta.name, metaBn(meta));
  out.districts = rows.length;
  out.alert = rows.filter((r) => r.status === LocalSiteStatus.ALERT).length;
  out.watch = rows.filter((r) => r.status === LocalSiteStatus.WATCH).length;
  out.ok = rows.filter((r) => r.status === LocalSiteStatus.OK).length;
  out.pressureAvg = avg(rows.map((r) => r.pressure));
  out.attendanceAvg = avg(rows.map((r) => num(r.metrics, "attendancePct")));
  out.dropoutAvg = avg(rows.map((r) => num(r.metrics, "dropoutPct")));
  out.teacherGap = rows.reduce((s, r) => s + num(r.metrics, "teacherGap"), 0);
  out.dengue7d = rows.reduce((s, r) => s + num(r.metrics, "dengueCases7d"), 0);
  out.occupancyAvg = avg(rows.map((r) => num(r.metrics, "occupancyPct")));
  out.stockouts = rows.filter((r) => flag(r.metrics, "stockout")).length;
  out.unemploymentAvg = avg(rows.map((r) => num(r.metrics, "unemploymentPct")));
  out.youthUnempAvg = avg(rows.map((r) => num(r.metrics, "youthUnempPct")));
  out.vacancies = rows.reduce((s, r) => s + num(r.metrics, "vacanciesListed"), 0);
  out.trainingSeats = rows.reduce((s, r) => s + num(r.metrics, "trainingSeats"), 0);
  out.jobFairGaps = rows.filter((r) => flag(r.metrics, "jobFairGap")).length;
  out.hotDistricts = [...rows]
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 3)
    .map((r) => ({ name: r.name, nameBn: r.nameBn, pressure: r.pressure }));
  const hottest = rows.slice().sort((a, b) => b.pressure - a.pressure)[0];
  out.opsHint = hottest
    ? opsHint(sector, hottest.metrics)
    : { horizon: "0-24h", en: "", bn: "" };
  return out;
}

function metaBn(m: { nameBn: string | null }): string | null {
  return m.nameBn;
}

function jobActions(
  divisions: NationalSectorBoard["divisions"],
  jobsDistricts: NationalDistrictSlice[],
): NationalJobAction[] {
  const byCode = (pred: (d: NationalSectorBoard["divisions"][number]) => boolean) =>
    divisions.filter(pred).map((d) => d.name);
  const fair = jobsDistricts.filter((d) => flag(d.metrics, "jobFairGap"));
  const skill = jobsDistricts.filter(
    (d) => num(d.metrics, "youthUnempPct") >= 22 && num(d.metrics, "trainingSeats") < 90,
  );
  const vacancy = jobsDistricts.filter(
    (d) => num(d.metrics, "unemploymentPct") >= 12 && num(d.metrics, "vacanciesListed") < 30,
  );
  const rural = jobsDistricts.filter((d) =>
    ["Rangpur", "Mymensingh", "Barishal"].includes(d.divisionName),
  );
  const industry = jobsDistricts.filter((d) =>
    ["Dhaka", "Chattogram"].includes(d.divisionName),
  );
  const actions: NationalJobAction[] = [
    {
      id: "JOB_FAIR",
      title: "7-day district job fairs",
      titleBn: "৭ দিনের জেলা জব ফেয়ার",
      detail: "DYD + BSCIC + employers; publish vacancy list before Friday; women-only booth.",
      detailBn: "ডিওয়াইডি + বিসিক + নিয়োগকর্তা; শুক্রবারের আগে শূন্যপদ; নারী বুথ।",
      targetDivisions: byCode((d) => d.jobs.jobFairGaps > 0),
      affectedDistricts: fair.length,
    },
    {
      id: "SKILL_TRAINING",
      title: "Open TTC / short skill batches",
      titleBn: "টিটিসি / স্বল্পমেয়াদি স্কিল ব্যাচ",
      detail: "30-day trades (electrical, ICT, garments, agro-processing); 30% seats for women.",
      detailBn: "৩০ দিনের ট্রেড (ইলেকট্রিক্যাল, আইসিটি, গার্মেন্টস, কৃষি প্রক্রিয়াজাত); ৩০% নারী।",
      targetDivisions: byCode((d) => d.jobs.youthUnempAvg >= 20),
      affectedDistricts: skill.length,
    },
    {
      id: "VACANCY_DRIVE",
      title: "Public vacancy + employer roundtable",
      titleBn: "সরকারি শূন্যপদ + নিয়োগকর্তা রাউন্ডটেবিল",
      detail: "DC office posts all public vacancies; one employer roundtable this week.",
      detailBn: "ডিসি অফিসে সব সরকারি শূন্যপদ; এই সপ্তাহে একটি নিয়োগকর্তা বৈঠক।",
      targetDivisions: byCode((d) => d.jobs.unemploymentAvg >= 12),
      affectedDistricts: vacancy.length,
    },
    {
      id: "RURAL_WORKS",
      title: "Rural works / agro processing intake",
      titleBn: "গ্রামীণ কাজ / কৃষি প্রক্রিয়াজাতকরণ",
      detail: "EGPP-style short works plus one agro-processing batch in high-unemployment north/south.",
      detailBn: "উচ্চ বেকার উত্তর/দক্ষিণে স্বল্পমেয়াদি গ্রামীণ কাজ + একটি কৃষি প্রক্রিয়াজাত ব্যাচ।",
      targetDivisions: byCode((d) => ["70", "90", "80"].includes(d.code)),
      affectedDistricts: rural.filter((d) => num(d.metrics, "unemploymentPct") >= 12).length,
    },
    {
      id: "INDUSTRY_LINK",
      title: "EPZ / industry skill link",
      titleBn: "ইপিজেড / শিল্প স্কিল লিংক",
      detail: "Map TTC graduates to EPZ and large factory intake in Dhaka and Chattogram this month.",
      detailBn: "এই মাসে ঢাকা ও চট্টগ্রামে টিটিসি গ্র্যাজুয়েটকে ইপিজেড/বড় কারখানায় ম্যাপ করুন।",
      targetDivisions: byCode((d) => ["30", "20"].includes(d.code)),
      affectedDistricts: industry.filter((d) => num(d.metrics, "youthUnempPct") >= 18).length,
    },
  ];
  return actions.filter((a) => a.affectedDistricts > 0 || a.targetDivisions.length > 0);
}

async function readCache(): Promise<NationalSectorBoard | null> {
  if (mem && mem.exp > Date.now()) return mem.data;
  if (!isRedisEnabled()) return null;
  try {
    const raw = await getRedisClient().get(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as NationalSectorBoard;
    if (!data?.divisions?.[0]?.education || !data?.jobActions) return null;
    mem = { exp: Date.now() + TTL_SEC * 1000, data };
    return data;
  } catch {
    return null;
  }
}

async function writeCache(data: NationalSectorBoard): Promise<void> {
  mem = { exp: Date.now() + TTL_SEC * 1000, data };
  if (!isRedisEnabled()) return;
  try {
    await getRedisClient().setex(CACHE_KEY, TTL_SEC, JSON.stringify(data));
  } catch {
    /* in-process cache still holds */
  }
}

export class NationalSectorService {
  async getBoard(user: { role: UserRole; adminUnitId: string | null }): Promise<NationalSectorBoard> {
    if (user.role !== UserRole.PMO && user.role !== UserRole.MINISTER) {
      throw ApiError.forbidden("National education / health / jobs board is PMO / Minister only");
    }

    const cached = await readCache();
    if (cached) return cached;

    const [divisions, rows, evidenceRows] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { type: AdminUnitType.DIVISION },
        select: { id: true, code: true, name: true, nameBn: true },
        orderBy: { name: "asc" },
      }),
      prismaRead.nationalSectorSnapshot.findMany({
        include: {
          adminUnit: {
            select: {
              id: true,
              code: true,
              name: true,
              nameBn: true,
              parentId: true,
              parent: { select: { id: true, code: true, name: true, nameBn: true } },
            },
          },
        },
      }),
      prismaRead.localEvidenceItem.findMany({
        where: {
          geoScope: EvidenceGeoScope.NATIONAL,
          topics: { hasSome: ["EDUCATION", "HEALTH", "UNEMPLOYMENT"] },
        },
        orderBy: [{ strength: "desc" }, { year: "desc" }],
        take: 4,
      }),
    ]);

    const districtOf = (
      sector: LocalSector,
      row: (typeof rows)[number],
    ): NationalDistrictSlice | null => {
      const unit = row.adminUnit;
      const parent = unit.parent;
      if (!parent) return null;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      return {
        id: unit.id,
        code: unit.code,
        name: unit.name,
        nameBn: unit.nameBn,
        divisionId: parent.id,
        divisionName: parent.name,
        divisionNameBn: parent.nameBn,
        status: row.status,
        severity: row.severity,
        pressure: Math.round(pressureOf(sector, metrics)),
        metrics,
        opsHint: opsHint(sector, metrics),
      };
    };

    const education: NationalDistrictSlice[] = [];
    const health: NationalDistrictSlice[] = [];
    const jobs: NationalDistrictSlice[] = [];
    for (const row of rows) {
      const slice = districtOf(row.sector, row);
      if (!slice) continue;
      if (row.sector === LocalSector.EDUCATION) education.push(slice);
      else if (row.sector === LocalSector.HEALTH) health.push(slice);
      else jobs.push(slice);
    }
    const byPressure = (a: NationalDistrictSlice, b: NationalDistrictSlice) =>
      b.pressure - a.pressure || a.name.localeCompare(b.name);
    education.sort(byPressure);
    health.sort(byPressure);
    jobs.sort(byPressure);

    const packed = divisions.map((div) => {
      const edu = rollDivision(div, LocalSector.EDUCATION, education.filter((d) => d.divisionId === div.id));
      const hlt = rollDivision(div, LocalSector.HEALTH, health.filter((d) => d.divisionId === div.id));
      const emp = rollDivision(div, LocalSector.EMPLOYMENT, jobs.filter((d) => d.divisionId === div.id));
      return {
        id: div.id,
        code: div.code,
        name: div.name,
        nameBn: div.nameBn,
        education: edu,
        health: hlt,
        jobs: emp,
      };
    });

    const evidence: NationalSectorEvidence[] = evidenceRows.map((row) => {
      const solutions = (row.solutions ?? {}) as { now?: { en?: string; bn?: string } };
      return {
        id: row.id,
        title: row.title,
        titleBn: row.titleBn,
        abstract: row.abstract,
        abstractBn: row.abstractBn,
        sourceName: row.sourceName,
        url: row.url,
        year: row.year,
        topics: row.topics,
        doNow: {
          en: solutions.now?.en ?? "Use the abstract to brief the line ministry — full paper is not stored.",
          bn: solutions.now?.bn ?? "অ্যাবস্ট্রাক্ট দিয়ে লাইন মন্ত্রণালয়কে ব্রিফ করুন — পূর্ণ পেপার নেই।",
        },
      };
    });

    const data: NationalSectorBoard = {
      generatedAt: new Date().toISOString(),
      sourceNote:
        "District roll-up of seeded education / health / employment pressure — not a live EMIS, DGHS, or BBS labour feed. Abstracts only, not full papers.",
      summary: {
        districts: new Set([...education, ...health, ...jobs].map((d) => d.id)).size,
        divisions: packed.length,
        educationAlerts: education.filter((d) => d.status === LocalSiteStatus.ALERT).length,
        healthAlerts: health.filter((d) => d.status === LocalSiteStatus.ALERT).length,
        jobsAlerts: jobs.filter((d) => d.status === LocalSiteStatus.ALERT).length,
        attendanceAvg: avg(education.map((d) => num(d.metrics, "attendancePct"))),
        teacherGap: education.reduce((s, d) => s + num(d.metrics, "teacherGap"), 0),
        dengue7d: health.reduce((s, d) => s + num(d.metrics, "dengueCases7d"), 0),
        stockouts: health.filter((d) => flag(d.metrics, "stockout")).length,
        unemploymentAvg: avg(jobs.map((d) => num(d.metrics, "unemploymentPct"))),
        jobFairGaps: jobs.filter((d) => flag(d.metrics, "jobFairGap")).length,
        vacancies: jobs.reduce((s, d) => s + num(d.metrics, "vacanciesListed"), 0),
        trainingSeats: jobs.reduce((s, d) => s + num(d.metrics, "trainingSeats"), 0),
      },
      divisions: packed,
      districts: { education, health, jobs },
      jobActions: jobActions(packed, jobs),
      evidence,
    };

    await writeCache(data);
    return data;
  }
}

export const nationalSectorService = new NationalSectorService();
