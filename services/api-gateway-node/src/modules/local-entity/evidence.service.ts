import { EvidenceGeoScope, EvidenceKind, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { catalogByUnitCode } from "./local-entity.catalog";
import { resolveLocalEntityId } from "./local-entity.scope";

export const EVIDENCE_TOPICS = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "UNREST",
  "EDUCATION",
  "HEALTH",
  "UNEMPLOYMENT",
  "CRIME",
  "CORRUPTION",
  "OTHER",
] as const;
export type EvidenceTopic = (typeof EVIDENCE_TOPICS)[number];

export type HorizonCopy = { en: string; bn: string };
export type EvidenceSolutions = {
  now: HorizonCopy;
  week: HorizonCopy;
  days90: HorizonCopy;
};

const TOPIC_KW: Array<{ topic: EvidenceTopic; keys: string[] }> = [
  { topic: "POWER", keys: ["বিদ্যুৎ", "লোডশেডিং", "load-shedding", "load shedding", "electricity", "feeder", "blackout", "pdb"] },
  { topic: "GAS", keys: ["গ্যাস", "তিতাস", "titas", "cng", "সিএনজি"] },
  { topic: "FUEL", keys: ["জ্বালানি", "ডিজেল", "diesel", "octane", "petrol", "fuel"] },
  { topic: "WATER", keys: ["ওয়াসা", "wasa", "পানি সরবরাহ", "water supply"] },
  { topic: "DRAINAGE", keys: ["জলাবদ্ধ", "ড্রেন", "খাল", "waterlog", "dredg", "drainage"] },
  { topic: "ROAD", keys: ["পথহোল", "pothole", "সড়ক", "যানজট", "traffic", "transport"] },
  { topic: "UNREST", keys: ["আন্দোলন", "বিক্ষোভ", "হরতাল", "protest", "hartal", "demonstration"] },
  { topic: "EDUCATION", keys: ["স্কুল", "শিক্ষা", "education", "dropout", "teacher"] },
  { topic: "HEALTH", keys: ["স্বাস্থ্য", "হাসপাতাল", "ডেঙ্গু", "health", "clinic", "dengue"] },
  { topic: "UNEMPLOYMENT", keys: ["বেকার", "কর্মসংস্থান", "unemployment", "job fair", "skill"] },
  { topic: "CRIME", keys: ["চুরি", "খুন", "ছিনতাই", "মাদক", "crime", "theft", "murder"] },
  { topic: "CORRUPTION", keys: ["দুর্নীতি", "ঘুষ", "টেন্ডার", "corruption", "bribe", "procurement"] },
];

export function classifyEvidenceTopics(text: string): EvidenceTopic[] {
  const blob = text.toLowerCase();
  const hits = TOPIC_KW.filter((row) => row.keys.some((k) => blob.includes(k.toLowerCase()))).map(
    (r) => r.topic,
  );
  return hits.length ? [...new Set(hits)] : ["OTHER"];
}

export function outageKindToTopic(kind: string): EvidenceTopic {
  const k = kind.toUpperCase();
  if ((EVIDENCE_TOPICS as readonly string[]).includes(k)) return k as EvidenceTopic;
  return "OTHER";
}

export function unrestThemeToTopics(themeId: string): EvidenceTopic[] {
  switch (themeId) {
    case "power":
      return ["POWER", "UNREST"];
    case "gas":
    case "gas_fuel":
    case "fuel":
      return ["GAS", "FUEL", "UNREST"];
    case "road_transport":
      return ["ROAD", "UNREST"];
    case "water_flood":
      return ["WATER", "DRAINAGE", "UNREST"];
    case "corruption":
      return ["CORRUPTION", "UNREST"];
    default:
      return ["UNREST"];
  }
}

function parseSolutions(raw: unknown): EvidenceSolutions {
  const obj = (raw ?? {}) as Partial<EvidenceSolutions>;
  const empty = { en: "", bn: "" };
  return {
    now: { en: obj.now?.en ?? empty.en, bn: obj.now?.bn ?? empty.bn },
    week: { en: obj.week?.en ?? empty.en, bn: obj.week?.bn ?? empty.bn },
    days90: { en: obj.days90?.en ?? empty.en, bn: obj.days90?.bn ?? empty.bn },
  };
}

function districtAliases(code: string): string[] {
  if (code === "COCC") return ["cumilla", "comilla"];
  return ["chattogram", "chittagong"];
}

function keywordHay(code: string): string[] {
  const cat = catalogByUnitCode(code);
  return [
    cat?.nameEn,
    cat?.nameBn,
    ...(cat?.osintKeywords ?? []),
    ...(cat?.focusAreasEn ?? []),
    ...(cat?.focusAreasBn ?? []),
  ]
    .map((x) => (x ?? "").toLowerCase())
    .filter((x) => x.length >= 3);
}

export class LocalEvidenceService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: {
      entityId?: string;
      topics?: EvidenceTopic[];
      kind?: EvidenceKind;
      year?: number;
      q?: string;
      limit?: number;
    } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true },
    });
    const code = entity?.code ?? "";
    const aliases = districtAliases(code);
    const keys = keywordHay(code);
    const limit = Math.min(opts.limit ?? 40, 80);
    const topics = (opts.topics ?? []).filter((t) =>
      (EVIDENCE_TOPICS as readonly string[]).includes(t),
    );

    const rows = await prismaRead.localEvidenceItem.findMany({
      where: {
        ...(opts.kind ? { kind: opts.kind } : {}),
        ...(opts.year ? { year: opts.year } : {}),
        ...(topics.length ? { topics: { hasSome: topics } } : {}),
        ...(opts.q
          ? {
              OR: [
                { title: { contains: opts.q, mode: "insensitive" } },
                { titleBn: { contains: opts.q, mode: "insensitive" } },
                { abstract: { contains: opts.q, mode: "insensitive" } },
                { author: { contains: opts.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ strength: "desc" }, { year: "desc" }],
      take: 200,
    });

    const scored = rows
      .map((row) => {
        const d = (row.district ?? "").toLowerCase();
        const blob = `${row.title} ${row.titleBn ?? ""} ${row.abstract} ${row.institution ?? ""}`.toLowerCase();
        const entityHit = row.entityId === entityId;
        const districtHit = aliases.some((a) => d.includes(a) || a.includes(d));
        const localKw = keys.some((k) => blob.includes(k));
        const national = row.geoScope === EvidenceGeoScope.NATIONAL;
        if (row.geoScope === EvidenceGeoScope.ENTITY && row.entityId && row.entityId !== entityId) {
          return null;
        }
        if (row.geoScope === EvidenceGeoScope.DISTRICT && !districtHit && !localKw) {
          return null;
        }
        const rank =
          (entityHit ? 40 : 0) +
          (districtHit ? 24 : 0) +
          (localKw ? 12 : 0) +
          (national ? 6 : 0) +
          row.strength * 4 +
          Math.min(8, Math.max(0, row.year - 2018));
        return { row, rank, local: entityHit || districtHit || localKw };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.rank - a.rank || b.row.year - a.row.year)
      .slice(0, limit);

    const items = scored.map(({ row, local }) => ({
      id: row.id,
      kind: row.kind,
      topics: row.topics,
      title: row.title,
      titleBn: row.titleBn,
      abstract: row.abstract,
      abstractBn: row.abstractBn,
      author: row.author,
      institution: row.institution,
      sourceName: row.sourceName,
      url: row.url,
      year: row.year,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      strength: row.strength,
      geoScope: row.geoScope,
      district: row.district,
      division: row.division,
      local,
      solutions: parseSolutions(row.solutions),
    }));

    const byKind = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.kind] = (acc[it.kind] ?? 0) + 1;
      return acc;
    }, {});
    const topicCounts = new Map<string, number>();
    for (const it of items) {
      for (const t of it.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    }

    return {
      entityId,
      entityCode: entity?.code ?? null,
      generatedAt: new Date().toISOString(),
      sourceNote:
        "Curated abstracts and expert summaries — not full papers. Demo / open-source grounded.",
      summary: {
        total: items.length,
        thesis: byKind.THESIS ?? 0,
        expert: byKind.EXPERT ?? 0,
        policy: byKind.POLICY_BRIEF ?? 0,
        localHits: items.filter((i) => i.local).length,
        topics: [...topicCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id, count]) => ({ id, count })),
      },
      items,
    };
  }

  async forContext(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; topics: EvidenceTopic[]; limit?: number },
  ) {
    const feed = await this.list(user, {
      entityId: opts.entityId,
      topics: opts.topics,
      limit: opts.limit ?? 6,
    });
    return {
      topics: opts.topics,
      generatedAt: feed.generatedAt,
      sourceNote: feed.sourceNote,
      items: feed.items.slice(0, opts.limit ?? 6),
    };
  }

  /** One query across the five PM desks — abstracts + do-now only. */
  async nationalSnippets(opts: {
    topics: EvidenceTopic[];
    units: Array<{ id: string; code: string }>;
    limit?: number;
  }) {
    const limit = Math.min(opts.limit ?? 4, 8);
    const topics = (opts.topics ?? []).filter((t) =>
      (EVIDENCE_TOPICS as readonly string[]).includes(t),
    );
    const hitsByEntity: Record<string, number> = Object.fromEntries(
      opts.units.map((u) => [u.id, 0]),
    );
    const sourceNote =
      "Curated abstracts and expert summaries — not full papers. Demo / open-source grounded.";
    if (!opts.units.length) {
      return { topics, sourceNote, items: [] as NationalEvidenceSnippet[], hitsByEntity };
    }

    const unitMeta = opts.units.map((u) => ({
      ...u,
      aliases: districtAliases(u.code),
      keys: keywordHay(u.code),
    }));
    const unitIds = new Set(opts.units.map((u) => u.id));

    const rows = await prismaRead.localEvidenceItem.findMany({
      where: topics.length ? { topics: { hasSome: topics } } : {},
      orderBy: [{ strength: "desc" }, { year: "desc" }],
      take: 200,
    });

    const scored = rows
      .map((row) => {
        if (
          row.geoScope === EvidenceGeoScope.ENTITY &&
          row.entityId &&
          !unitIds.has(row.entityId)
        ) {
          return null;
        }
        const d = (row.district ?? "").toLowerCase();
        const blob =
          `${row.title} ${row.titleBn ?? ""} ${row.abstract} ${row.institution ?? ""}`.toLowerCase();
        const localUnits = unitMeta.filter((u) => {
          const entityHit = row.entityId === u.id;
          const districtHit = u.aliases.some((a) => d.includes(a) || a.includes(d));
          const localKw = u.keys.some((k) => blob.includes(k));
          return entityHit || districtHit || localKw;
        });
        if (row.geoScope === EvidenceGeoScope.DISTRICT && !localUnits.length) return null;

        for (const u of localUnits) hitsByEntity[u.id] = (hitsByEntity[u.id] ?? 0) + 1;

        const best =
          localUnits.find((u) => row.entityId === u.id) ?? localUnits[0] ?? null;
        const entityHit = Boolean(best && row.entityId === best.id);
        const rank =
          (entityHit ? 40 : 0) +
          (localUnits.length ? 24 : 0) +
          (row.geoScope === EvidenceGeoScope.NATIONAL ? 6 : 0) +
          row.strength * 4 +
          Math.min(8, Math.max(0, row.year - 2018));
        return { row, rank, local: best };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.rank - a.rank || b.row.year - a.row.year)
      .slice(0, limit);

    const items: NationalEvidenceSnippet[] = scored.map(({ row, local }) => ({
      id: row.id,
      kind: row.kind,
      topics: row.topics,
      title: row.title,
      titleBn: row.titleBn,
      abstract: row.abstract,
      abstractBn: row.abstractBn,
      author: row.author,
      institution: row.institution,
      sourceName: row.sourceName,
      url: row.url,
      year: row.year,
      strength: row.strength,
      localCode: local?.code ?? null,
      localEntityId: local?.id ?? null,
      doNow: parseSolutions(row.solutions).now,
    }));

    return { topics, sourceNote, items, hitsByEntity };
  }
}

export type NationalEvidenceSnippet = {
  id: string;
  kind: EvidenceKind;
  topics: string[];
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  author: string | null;
  institution: string | null;
  sourceName: string;
  url: string;
  year: number;
  strength: number;
  localCode: string | null;
  localEntityId: string | null;
  doNow: HorizonCopy;
};

export const localEvidenceService = new LocalEvidenceService();
