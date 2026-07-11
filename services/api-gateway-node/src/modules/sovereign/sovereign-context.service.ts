import { prismaRead } from "../../core/database/prisma.client";
import { ingestionService } from "../ingestion/ingestion.service";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";

const EXTRA_TERMS: Record<string, string[]> = {
  dhaka: ["dhaka", "ঢাকা", "dncc", "dscc"],
  chattogram: ["chattogram", "chittagong", "চট্টগ্রাম"],
  sylhet: ["sylhet", "সিলেট"],
  khulna: ["khulna", "খুলনা"],
  rajshahi: ["rajshahi", "রাজশাহী"],
  barishal: ["barishal", "বরিশাল"],
  mymensingh: ["mymensingh", "ময়মনসিংহ"],
  rangpur: ["rangpur", "রংপুর"],
};

const META_STOPWORDS = new Set([
  "tomar", "tomer", "tumar", "kache", "kachee", "ache", "aache", "ki", "kono",
  "data", "database", "information", "info", "list", "show", "tell", "what",
  "have", "you", "your", "the", "and", "are", "how", "many", "much", "about",
  "তোমার", "তোমার", "কাছে", "আছে", "কি", "কোন", "ডেটা", "তথ্য", "দাও", "বলো",
  "কত", "কতগুলো", "সব", "জানাও", "দেখাও",
]);

function extractSearchTerms(message: string): string[] {
  const lower = message.toLowerCase();
  const raw = lower.split(/[\s,.:;!?()]+/).filter((t) => t.length > 2);
  const terms = new Set(raw.filter((t) => !META_STOPWORDS.has(t)));
  for (const [key, aliases] of Object.entries(EXTRA_TERMS)) {
    if (raw.some((t) => t.includes(key) || aliases.some((a) => lower.includes(a)))) {
      aliases.forEach((a) => terms.add(a));
    }
  }
  return [...terms];
}

function isInventoryQuery(message: string): boolean {
  const q = message.toLowerCase();
  const patterns = [
    /ki\s*ki\s*data/,
    /kono\s*data/,
    /data\s*ache/,
    /kache\s*ki/,
    /tomar\s*kache/,
    /tomer\s*kache/,
    /what\s*data/,
    /which\s*data/,
    /how\s*much\s*data/,
    /list\s*(of\s*)?data/,
    /কি\s*কি\s*ডেটা/,
    /কোন\s*ডেটা/,
    /ডেটা\s*আছে/,
    /তোমার\s*কাছে/,
    /তোমার\s*কাছে\s*কি/,
    /কত\s*ডেটা/,
    /সব\s*ডেটা/,
    /তথ্য\s*আছে/,
  ];
  return patterns.some((p) => p.test(q));
}

function formatProjectLine(p: {
  title: string;
  status: string;
  budgetAllocated: unknown;
  budgetSpent: unknown;
  adminUnit: { name: string; nameBn: string | null };
  _count: { redFlagAlerts: number };
}): string {
  const alloc = Number(p.budgetAllocated);
  const spent = Number(p.budgetSpent);
  const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
  return `- ${p.title} | ${p.adminUnit.nameBn ?? p.adminUnit.name} | status=${p.status} | budget_used=${pct}% | open_alerts=${p._count.redFlagAlerts}`;
}

async function buildPlatformSnapshot(scope: DashboardScopeQuery = {}): Promise<string> {
  const scopeUnitId =
    scope.unionId ?? scope.upazilaId ?? scope.districtId ?? scope.divisionId;

  const unitFilter = scopeUnitId ? { adminUnitId: scopeUnitId } : {};
  const projectScope = scopeUnitId ? { adminUnitId: scopeUnitId } : undefined;

  const [
    counts,
    divisions,
    projects,
    alerts,
    kpis,
    reps,
    commodities,
    agroMarkets,
    kpiDefs,
    newsArticles,
  ] = await Promise.all([
    Promise.all([
      prismaRead.adminUnit.count(),
      prismaRead.project.count({ where: projectScope }),
      prismaRead.representative.count({ where: unitFilter }),
      prismaRead.kpiRecord.count(),
      prismaRead.redFlagAlert.count({ where: { resolvedAt: null } }),
      prismaRead.commodityPriceLog.count(),
      prismaRead.agroMarket.count(),
      prismaRead.kpiDefinition.count(),
      prismaRead.externalArticle.count({
        where: { fetchedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]),
    prismaRead.adminUnit.findMany({
      where: { type: "DIVISION" },
      orderBy: { name: "asc" },
      select: { name: true, nameBn: true, code: true },
    }),
    prismaRead.project.findMany({
      where: projectScope,
      include: {
        adminUnit: { select: { name: true, nameBn: true } },
        _count: { select: { redFlagAlerts: { where: { resolvedAt: null } } } },
      },
      take: 20,
      orderBy: { budgetAllocated: "desc" },
    }),
    prismaRead.redFlagAlert.findMany({
      where: {
        resolvedAt: null,
        ...(scopeUnitId ? { project: { adminUnitId: scopeUnitId } } : {}),
      },
      include: {
        project: {
          select: {
            title: true,
            adminUnit: { select: { name: true, nameBn: true } },
          },
        },
      },
      take: 12,
      orderBy: { severity: "desc" },
    }),
    prismaRead.kpiRecord.findMany({
      where: scopeUnitId
        ? { representative: { adminUnitId: scopeUnitId } }
        : undefined,
      include: {
        kpiDef: { select: { name: true, code: true, unit: true } },
        representative: {
          select: { name: true, adminUnit: { select: { name: true, nameBn: true } } },
        },
      },
      take: 15,
      orderBy: { recordedAt: "desc" },
    }),
    prismaRead.representative.findMany({
      where: unitFilter,
      include: { adminUnit: { select: { name: true, nameBn: true } } },
      take: 16,
      orderBy: { name: "asc" },
    }),
    prismaRead.commodityPriceLog.findMany({
      distinct: ["commodityCode"],
      select: { commodityCode: true, countryName: true, landedCostUsd: true },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    prismaRead.agroMarket.findMany({
      select: {
        name: true,
        type: true,
        adminUnit: { select: { name: true, nameBn: true } },
      },
      take: 10,
      orderBy: { name: "asc" },
    }),
    prismaRead.kpiDefinition.findMany({
      select: { code: true, name: true, nameBn: true, unit: true },
      orderBy: { code: "asc" },
    }),
    ingestionService.listArticles(8, 7),
  ]);

  const [
    adminUnits,
    projectCount,
    repCount,
    kpiCount,
    alertCount,
    commodityCount,
    agroCount,
    kpiDefCount,
    newsCount,
  ] = counts;

  const lines: string[] = [
    "VERIFIED DATABASE — NATIONAL PLATFORM SNAPSHOT",
    "",
    "DATA INVENTORY (counts):",
    `- administrative_units: ${adminUnits} (8 divisions, 64 districts, upazilas, unions)`,
    `- national_projects: ${projectCount}`,
    `- representatives: ${repCount}`,
    `- kpi_time_series_records: ${kpiCount}`,
    `- kpi_definitions: ${kpiDefCount}`,
    `- open_red_flag_alerts: ${alertCount}`,
    `- commodity_price_observations: ${commodityCount}`,
    `- agro_markets: ${agroCount}`,
    `- online_news_articles_7d: ${newsCount} (RSS + Google News ingestion)`,
    "",
    "8 DIVISIONS:",
    ...divisions.map((d) => `- ${d.name} / ${d.nameBn ?? d.name} (code ${d.code})`),
  ];

  if (kpiDefs.length > 0) {
    lines.push("", "KPI DEFINITIONS:");
    for (const k of kpiDefs) {
      lines.push(`- ${k.name} (${k.code})${k.nameBn ? ` / ${k.nameBn}` : ""} — unit: ${k.unit ?? "—"}`);
    }
  }

  if (reps.length > 0) {
    lines.push("", "REPRESENTATIVES (sample):");
    for (const r of reps) {
      lines.push(`- ${r.name} | ${r.role} | ${r.party ?? "—"} | ${r.adminUnit.nameBn ?? r.adminUnit.name}`);
    }
  }

  if (projects.length > 0) {
    lines.push("", "MAJOR PROJECTS (top by budget, crore BDT):");
    for (const p of projects) {
      lines.push(formatProjectLine(p));
    }
  }

  if (alerts.length > 0) {
    lines.push("", "OPEN RED FLAGS:");
    for (const a of alerts) {
      lines.push(
        `- ${a.flagType} (severity ${a.severity}) | ${a.project.title} | ${a.project.adminUnit.nameBn ?? a.project.adminUnit.name} | ${(a.aiExplanation ?? "").slice(0, 150)}`,
      );
    }
  }

  if (kpis.length > 0) {
    lines.push("", "RECENT KPI RECORDS:");
    for (const k of kpis) {
      lines.push(
        `- ${k.kpiDef.name} (${k.kpiDef.code}): ${k.value}${k.kpiDef.unit ? ` ${k.kpiDef.unit}` : ""} | ${k.representative.name} | ${k.representative.adminUnit.nameBn ?? k.representative.adminUnit.name}`,
      );
    }
  }

  if (commodities.length > 0) {
    lines.push("", "COMMODITY PRICES (latest per commodity, USD/MT):");
    for (const c of commodities) {
      lines.push(`- ${c.commodityCode} from ${c.countryName}: landed $${Number(c.landedCostUsd).toFixed(0)}`);
    }
  }

  if (agroMarkets.length > 0) {
    lines.push("", "AGRO MARKETS:");
    for (const m of agroMarkets) {
      lines.push(`- ${m.name} (${m.type}) | ${m.adminUnit.nameBn ?? m.adminUnit.name}`);
    }
  }

  if (newsArticles.length > 0) {
    lines.push("", "ONLINE NEWS HEADLINES (last 7 days, RSS/Google):");
    for (const n of newsArticles) {
      lines.push(
        `- [${n.sentimentCategory ?? "—"}] ${n.sourceName} | ${n.district ?? "National"} | ${n.title.slice(0, 140)}`,
      );
    }
  }

  lines.push(
    "",
    "INSTRUCTION: Summarize this verified inventory for the user in clear Bengali Markdown. " +
      "List data categories with counts, highlight major projects and red flags. " +
      "Do NOT say the database is empty.",
  );

  return lines.join("\n");
}

const MAX_CONTEXT_CHARS = 8000;

function truncateContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return (
    text.slice(0, MAX_CONTEXT_CHARS) +
    "\n\n[...context truncated for model latency; counts and top records above are authoritative]"
  );
}

export async function buildSovereignContext(
  userMessage: string,
  scope: DashboardScopeQuery = {},
): Promise<string> {
  const q = userMessage.trim();

  if (isInventoryQuery(q)) {
    return truncateContext(await buildPlatformSnapshot(scope));
  }

  const searchTerms = extractSearchTerms(q);
  const scopeUnitId =
    scope.unionId ?? scope.upazilaId ?? scope.districtId ?? scope.divisionId;

  if (!scopeUnitId && searchTerms.length === 0) {
    return truncateContext(await buildPlatformSnapshot(scope));
  }

  const unitOr =
    searchTerms.length > 0
      ? searchTerms.flatMap((t) => [
          { name: { contains: t, mode: "insensitive" as const } },
          { nameBn: { contains: t, mode: "insensitive" as const } },
        ])
      : [];

  const matchedUnits =
    unitOr.length > 0
      ? await prismaRead.adminUnit.findMany({
          where: { OR: unitOr },
          take: 8,
          select: { id: true, name: true, nameBn: true, type: true },
        })
      : [];

  const unitIds = scopeUnitId
    ? [scopeUnitId]
    : matchedUnits.length > 0
      ? matchedUnits.map((u) => u.id)
      : [];

  const projectFilter =
    unitIds.length > 0 || searchTerms.length > 0
      ? {
          AND: [
            unitIds.length > 0 ? { adminUnitId: { in: unitIds } } : {},
            searchTerms.length > 0
              ? {
                  OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    ...searchTerms.map((t) => ({
                      title: { contains: t, mode: "insensitive" as const },
                    })),
                  ],
                }
              : {},
          ],
        }
      : {};

  const [projects, alerts, kpis, reps] = await Promise.all([
    prismaRead.project.findMany({
      where: Object.keys(projectFilter).length ? projectFilter : undefined,
      include: {
        adminUnit: { select: { name: true, nameBn: true } },
        _count: {
          select: {
            redFlagAlerts: { where: { resolvedAt: null } },
          },
        },
      },
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prismaRead.redFlagAlert.findMany({
      where: {
        resolvedAt: null,
        ...(unitIds.length > 0
          ? { project: { adminUnitId: { in: unitIds } } }
          : searchTerms.length > 0
            ? {
                OR: searchTerms.flatMap((t) => [
                  { aiExplanation: { contains: t, mode: "insensitive" as const } },
                  { project: { title: { contains: t, mode: "insensitive" as const } } },
                ]),
              }
            : {}),
      },
      include: {
        project: {
          select: {
            title: true,
            adminUnit: { select: { name: true, nameBn: true } },
          },
        },
      },
      take: 8,
      orderBy: { severity: "desc" },
    }),
    prismaRead.kpiRecord.findMany({
      where:
        unitIds.length > 0
          ? { representative: { adminUnitId: { in: unitIds } } }
          : searchTerms.length > 0
            ? {
                OR: searchTerms.flatMap((t) => [
                  { kpiDef: { name: { contains: t, mode: "insensitive" as const } } },
                  { representative: { name: { contains: t, mode: "insensitive" as const } } },
                ]),
              }
            : undefined,
      include: {
        kpiDef: { select: { name: true, code: true, unit: true } },
        representative: {
          select: { name: true, adminUnit: { select: { name: true, nameBn: true } } },
        },
      },
      take: 10,
      orderBy: { recordedAt: "desc" },
    }),
    searchTerms.length > 0
      ? prismaRead.representative.findMany({
          where: {
            OR: searchTerms.flatMap((t) => [
              { name: { contains: t, mode: "insensitive" as const } },
              { party: { contains: t, mode: "insensitive" as const } },
            ]),
          },
          include: { adminUnit: { select: { name: true, nameBn: true } } },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const lines: string[] = [];

  if (matchedUnits.length > 0) {
    lines.push("ADMINISTRATIVE UNITS (verified DB):");
    for (const u of matchedUnits) {
      lines.push(`- ${u.name}${u.nameBn ? ` / ${u.nameBn}` : ""} (${u.type})`);
    }
  }

  if (reps.length > 0) {
    lines.push("\nREPRESENTATIVES:");
    for (const r of reps) {
      lines.push(`- ${r.name} | ${r.role} | ${r.party ?? "—"} | ${r.adminUnit.name}`);
    }
  }

  if (projects.length > 0) {
    lines.push("\nPROJECTS:");
    for (const p of projects) {
      lines.push(formatProjectLine(p));
    }
  }

  if (alerts.length > 0) {
    lines.push("\nOPEN RED FLAGS:");
    for (const a of alerts) {
      lines.push(
        `- ${a.flagType} (severity ${a.severity}) | ${a.project.title} | ${a.project.adminUnit.name} | ${(a.aiExplanation ?? "").slice(0, 150)}`,
      );
    }
  }

  if (kpis.length > 0) {
    lines.push("\nRECENT KPI RECORDS:");
    for (const k of kpis) {
      lines.push(
        `- ${k.kpiDef.name} (${k.kpiDef.code}): ${k.value}${k.kpiDef.unit ? ` ${k.kpiDef.unit}` : ""} | ${k.representative.adminUnit.nameBn ?? k.representative.adminUnit.name}`,
      );
    }
  }

  if (searchTerms.length > 0) {
    const newsHits = await ingestionService.searchArticles(q, 6);
    if (newsHits.length > 0) {
      lines.push("\nONLINE NEWS (RSS/Google ingestion):");
      for (const n of newsHits) {
        lines.push(
          `- [${n.sentimentCategory ?? "—"}] ${n.sourceName} | ${n.district ?? "National"} | ${n.title.slice(0, 160)}`,
        );
      }
    }
  }

  if (lines.length === 0) {
    const snapshot = await buildPlatformSnapshot(scope);
    return truncateContext(
      "NOTE: No exact keyword match for this query — showing national verified snapshot instead.\n\n" +
        snapshot,
    );
  }

  return truncateContext(lines.join("\n"));
}
