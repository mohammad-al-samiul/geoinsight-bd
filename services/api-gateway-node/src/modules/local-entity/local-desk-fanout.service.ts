import { createHash } from "crypto";
import {
  AdminUnitType,
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
  IngestionSentiment,
  LocalIntegrityDomain,
  LocalIntegrityKind,
  LocalIntegrityStatus,
  LocalOsintChannel,
  LocalOsintSentiment,
  LocalPulseEventKind,
  LocalSector,
  LocalSiteKind,
  LocalSiteStatus,
  Prisma,
  ServiceOutageKind,
  ServiceOutageStatus,
  SignalSource,
  SpecialtySignalStatus,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { LOCAL_ENTITY_CODES, catalogByUnitCode } from "./local-entity.catalog";
import {
  civicCategory,
  classifyTopics,
  corruptionKind,
  crimeKind,
  matchEntity,
  outageKind,
  primaryTopic,
  pulseKind,
  sectorKind,
  specialtyModuleId,
  type DeskTopic,
} from "./local-desk-topics";

function fanoutId(entityId: string, url: string, kind: string): string {
  const h = createHash("sha1").update(`${entityId}|${url}|${kind}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = Buffer.from(h.subarray(0, 16)).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function osintSentiment(cat: IngestionSentiment | null): LocalOsintSentiment {
  if (cat === IngestionSentiment.Grievance) return LocalOsintSentiment.NEGATIVE;
  if (cat === IngestionSentiment.Demand) return LocalOsintSentiment.NEUTRAL;
  return LocalOsintSentiment.NEUTRAL;
}

function pickWard(
  wards: Array<{ id: string; name: string; nameBn: string | null }>,
  text: string,
): string | null {
  const blob = text.toLowerCase();
  for (const w of wards) {
    if (w.name && blob.includes(w.name.toLowerCase())) return w.id;
    if (w.nameBn && blob.includes(w.nameBn.toLowerCase())) return w.id;
  }
  return wards[0]?.id ?? null;
}

type RawHit = {
  title: string;
  summary: string | null;
  url: string;
  sourceName: string;
  district: string | null;
  division: string | null;
  sentiment: IngestionSentiment | null;
  publishedAt: Date;
};

export class LocalDeskFanoutService {
  async sync(): Promise<Record<string, unknown>> {
    const entities = await prismaRead.adminUnit.findMany({
      where: {
        type: { in: [AdminUnitType.CONSTITUENCY, AdminUnitType.CITY_CORPORATION] },
        code: { in: [...LOCAL_ENTITY_CODES] },
      },
      select: { id: true, code: true, name: true, type: true },
      orderBy: { code: "asc" },
    });

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [articles, signals] = await Promise.all([
      prismaRead.externalArticle.findMany({
        where: { fetchedAt: { gte: since } },
        orderBy: { fetchedAt: "desc" },
        take: 280,
        select: {
          title: true,
          summary: true,
          url: true,
          sourceName: true,
          district: true,
          division: true,
          sentimentCategory: true,
          publishedAt: true,
          fetchedAt: true,
        },
      }),
      prismaRead.liveSignal.findMany({
        where: { createdAt: { gte: since }, resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: 180,
        select: {
          title: true,
          body: true,
          url: true,
          sourceName: true,
          district: true,
          division: true,
          sentimentCategory: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const pool: RawHit[] = [
      ...articles.map((a) => ({
        title: a.title,
        summary: a.summary,
        url: a.url,
        sourceName: a.sourceName,
        district: a.district,
        division: a.division,
        sentiment: a.sentimentCategory,
        publishedAt: a.publishedAt ?? a.fetchedAt,
      })),
      ...signals.map((s) => ({
        title: s.title,
        summary: s.body,
        url: s.url,
        sourceName: s.sourceName,
        district: s.district,
        division: s.division,
        sentiment: s.sentimentCategory,
        publishedAt: s.publishedAt ?? s.createdAt,
      })),
    ];

    const detail: Array<Record<string, unknown>> = [];
    for (const entity of entities) {
      const wrote = await this.fanoutEntity(entity, pool);
      detail.push({ code: entity.code, ...wrote });
    }

    return {
      entities: entities.length,
      articles: articles.length,
      signals: signals.length,
      detail,
    };
  }

  private async fanoutEntity(
    entity: { id: string; code: string; name: string; type: AdminUnitType },
    pool: RawHit[],
  ) {
    const catalog = catalogByUnitCode(entity.code);
    const isMayor = catalog?.role === "MAYOR" || entity.type === AdminUnitType.CITY_CORPORATION;
    const wards = await prismaRead.adminUnit.findMany({
      where: { parentId: entity.id, type: AdminUnitType.WARD },
      select: { id: true, name: true, nameBn: true },
      orderBy: { code: "asc" },
    });

    const matched = pool
      .map((hit) => {
        const blob = `${hit.title} ${hit.summary ?? ""}`;
        const match = matchEntity(entity.code, hit.district, hit.division, blob);
        if (!match.hit) return null;
        const topics = classifyTopics(blob);
        return { hit, blob, match, topics, primary: primaryTopic(topics) };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.match.score + (b.topics[0]?.score ?? 0) - (a.match.score + (a.topics[0]?.score ?? 0)))
      .slice(0, 28);

    let osint = 0;
    let integrity = 0;
    let sector = 0;
    let outage = 0;
    let civic = 0;
    let specialty = 0;
    let pulse = 0;

    for (const row of matched) {
      try {
        await this.upsertOsint(entity.id, row.hit, row.match.keyword ?? row.topics[0]?.keyword ?? entity.code);
        osint += 1;

        const topics = new Set<DeskTopic>(row.topics.map((t) => t.topic));
        topics.add(row.primary);
        const localOrMayor = row.match.local || isMayor;

        if (topics.has("CRIME")) {
          await this.upsertIntegrity(entity.id, row.hit, row.blob, LocalIntegrityDomain.CRIME);
          integrity += 1;
        }
        if (topics.has("CORRUPTION")) {
          await this.upsertIntegrity(entity.id, row.hit, row.blob, LocalIntegrityDomain.CORRUPTION);
          integrity += 1;
        }
        if (topics.has("EDUCATION")) {
          await this.upsertSector(entity.id, row.hit, row.blob, LocalSector.EDUCATION);
          sector += 1;
        }
        if (topics.has("HEALTH")) {
          await this.upsertSector(entity.id, row.hit, row.blob, LocalSector.HEALTH);
          sector += 1;
        }
        if (topics.has("EMPLOYMENT")) {
          await this.upsertSector(entity.id, row.hit, row.blob, LocalSector.EMPLOYMENT);
          sector += 1;
        }
        if (topics.has("OUTAGE") && localOrMayor) {
          await this.upsertOutage(entity.id, row.hit, row.blob, pickWard(wards, row.blob));
          outage += 1;
        }
        if (topics.has("CIVIC") && localOrMayor) {
          const wardId = pickWard(wards, row.blob);
          if (wardId) {
            await this.upsertComplaint(entity.id, wardId, row.hit, row.blob);
            civic += 1;
          }
        }
        if ((topics.has("SPECIALTY") || row.match.local) && catalog) {
          const moduleId = specialtyModuleId(catalog, row.blob);
          if (moduleId) {
            await this.upsertSpecialty(entity.id, moduleId, row.hit, row.match.score);
            specialty += 1;
          }
        }
        if (topics.has("PULSE") || topics.has("UNREST")) {
          await this.upsertPulse(entity.id, row.hit, row.blob);
          pulse += 1;
        }
      } catch (err) {
        console.warn(
          `[local-desk] fanout skip ${entity.code}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return { matched: matched.length, osint, integrity, sector, outage, civic, specialty, pulse };
  }

  private async upsertOsint(
    entityId: string,
    hit: RawHit,
    keyword: string,
  ) {
    const id = fanoutId(entityId, hit.url, "osint");
    await prismaWrite.localOsintHit.upsert({
      where: { id },
      create: {
        id,
        title: clip(hit.title, 500),
        summary: hit.summary ? clip(hit.summary, 2000) : null,
        sourceName: clip(hit.sourceName, 120),
        sourceUrl: clip(hit.url, 2000),
        channel: LocalOsintChannel.NEWS,
        matchedKeyword: clip(keyword, 120),
        sentiment: osintSentiment(hit.sentiment),
        propagandaFlag: false,
        publishedAt: hit.publishedAt,
        entityId,
      },
      update: {
        title: clip(hit.title, 500),
        summary: hit.summary ? clip(hit.summary, 2000) : null,
        publishedAt: hit.publishedAt,
        sentiment: osintSentiment(hit.sentiment),
      },
    });
  }

  private async upsertIntegrity(
    entityId: string,
    hit: RawHit,
    blob: string,
    domain: LocalIntegrityDomain,
  ) {
    const id = fanoutId(entityId, hit.url, domain.toLowerCase());
    const kind =
      domain === LocalIntegrityDomain.CRIME
        ? (crimeKind(blob) as LocalIntegrityKind)
        : (corruptionKind(blob) as LocalIntegrityKind);
    const negative = hit.sentiment === IngestionSentiment.Grievance;
    await prismaWrite.localIntegrityIncident.upsert({
      where: { id },
      create: {
        id,
        domain,
        kind,
        status: negative ? LocalIntegrityStatus.OPEN : LocalIntegrityStatus.WATCH,
        source: SignalSource.NEWS,
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        metrics:
          domain === LocalIntegrityDomain.CRIME
            ? { count7d: 1, nightSharePct: 0, patrolGap: false, sourceUrl: hit.url }
            : { tenderFlag: kind === LocalIntegrityKind.TENDER, extraFeeTk: 0, sourceUrl: hit.url },
        severity: negative ? 4 : 3,
        occurredAt: hit.publishedAt,
        entityId,
      },
      update: {
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        occurredAt: hit.publishedAt,
      },
    });
  }

  private async upsertSector(
    entityId: string,
    hit: RawHit,
    blob: string,
    sector: LocalSector,
  ) {
    const id = fanoutId(entityId, hit.url, sector.toLowerCase());
    const kind = sectorKind(
      sector === LocalSector.EMPLOYMENT ? "EMPLOYMENT" : sector === LocalSector.HEALTH ? "HEALTH" : "EDUCATION",
      blob,
    ) as LocalSiteKind;
    const negative = hit.sentiment === IngestionSentiment.Grievance;
    const metrics =
      sector === LocalSector.EDUCATION
        ? { attendancePct: negative ? 72 : 88, dropoutPct: negative ? 9 : 4, teacherGap: negative ? 3 : 1 }
        : sector === LocalSector.HEALTH
          ? { dengueCases7d: /dengue|ডেঙ্গু/.test(blob) ? 6 : 1, occupancyPct: negative ? 91 : 74, stockout: false }
          : { unemploymentPct: negative ? 14 : 8, vacanciesListed: 4, jobFairGap: negative };
    await prismaWrite.localSectorSite.upsert({
      where: { id },
      create: {
        id,
        sector,
        kind,
        status: negative ? LocalSiteStatus.ALERT : LocalSiteStatus.WATCH,
        source: SignalSource.NEWS,
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        metrics,
        severity: negative ? 4 : 3,
        observedAt: hit.publishedAt,
        entityId,
      },
      update: {
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        metrics,
        status: negative ? LocalSiteStatus.ALERT : LocalSiteStatus.WATCH,
        observedAt: hit.publishedAt,
      },
    });
  }

  private async upsertOutage(
    entityId: string,
    hit: RawHit,
    blob: string,
    wardId: string | null,
  ) {
    const id = fanoutId(entityId, hit.url, "outage");
    const kind = outageKind(blob) as ServiceOutageKind;
    await prismaWrite.localServiceOutage.upsert({
      where: { id },
      create: {
        id,
        kind,
        source: SignalSource.NEWS,
        status: ServiceOutageStatus.WATCH,
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        severity: 3,
        affectedCount: 0,
        startedAt: hit.publishedAt,
        wardId,
        entityId,
      },
      update: {
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        startedAt: hit.publishedAt,
      },
    });
  }

  private async upsertComplaint(
    entityId: string,
    wardId: string,
    hit: RawHit,
    blob: string,
  ) {
    const id = fanoutId(entityId, hit.url, "civic");
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id },
      select: { status: true },
    });
    if (existing?.status === ComplaintStatus.RESOLVED) return;

    const category = civicCategory(blob) as ComplaintCategory;
    const slaDeadline = new Date(hit.publishedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const data = {
      title: clip(hit.title, 255),
      description: clip(`News-derived civic signal. ${hit.summary ?? ""}\n${hit.url}`, 4000),
      category,
      source: SignalSource.NEWS,
      severity: ComplaintSeverity.MEDIUM,
      status: ComplaintStatus.OPEN,
      locationLabel: clip(hit.sourceName, 255),
      slaDeadline,
      isRedAlert: false,
      wardId,
      entityId,
    };

    if (existing) {
      await prismaWrite.citizenComplaint.update({
        where: { id },
        data: { title: data.title, description: data.description },
      });
      return;
    }

    const openNews = await prismaRead.citizenComplaint.count({
      where: { entityId, source: SignalSource.NEWS, status: { not: ComplaintStatus.RESOLVED } },
    });
    if (openNews >= 20) return;

    await prismaWrite.citizenComplaint.create({ data: { id, ...data } });
  }

  private async upsertSpecialty(
    entityId: string,
    moduleId: string,
    hit: RawHit,
    score: number,
  ) {
    const id = fanoutId(entityId, hit.url, `spec:${moduleId}`);
    const negative = hit.sentiment === IngestionSentiment.Grievance;
    await prismaWrite.localSpecialtySignal.upsert({
      where: { id },
      create: {
        id,
        moduleId,
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        status: negative ? SpecialtySignalStatus.ALERT : SpecialtySignalStatus.WATCH,
        metricLabel: "match",
        metricValue: new Prisma.Decimal(score),
        metricUnit: "score",
        recordedAt: hit.publishedAt,
        entityId,
      },
      update: {
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        recordedAt: hit.publishedAt,
        metricValue: new Prisma.Decimal(score),
      },
    });
  }

  private async upsertPulse(entityId: string, hit: RawHit, blob: string) {
    const id = fanoutId(entityId, hit.url, "pulse");
    const existing = await prismaRead.localPulseEvent.findUnique({
      where: { id },
      select: { done: true },
    });
    if (existing?.done) return;
    const kind = pulseKind(blob) as LocalPulseEventKind;
    await prismaWrite.localPulseEvent.upsert({
      where: { id },
      create: {
        id,
        kind,
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        startsAt: hit.publishedAt,
        locationLabel: clip(hit.sourceName, 255),
        done: false,
        entityId,
      },
      update: {
        title: clip(hit.title, 255),
        detail: clip(`${hit.summary ?? hit.title}\n${hit.url}`, 2000),
        startsAt: hit.publishedAt,
      },
    });
  }
}

export const localDeskFanoutService = new LocalDeskFanoutService();
