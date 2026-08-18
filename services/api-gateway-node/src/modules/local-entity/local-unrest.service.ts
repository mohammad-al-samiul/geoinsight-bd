import { AdminUnitType, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { unrestService } from "../unrest/unrest.service";
import { resolveLocalEntityId } from "./local-entity.scope";
import { unrestOpsHint } from "./ops-solutions";
import { matchEntity } from "./local-desk-topics";

function hoursAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return (Date.now() - ts) / 36e5;
}

export class LocalUnrestService {
  async getDesk(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true, type: true },
    });
    if (!entity) {
      return {
        entityId,
        generatedAt: new Date().toISOString(),
        summary: {
          active: 0,
          last24h: 0,
          last7d: 0,
          trend: "stable" as const,
          localHits: 0,
        },
        tags: [] as Array<{ id: string; labelEn: string; labelBn: string; count: number }>,
        movements: [],
        signals: [],
        pins: [],
      };
    }

    const pulse = await unrestService.buildPulse();
    const code = entity.code;

    const movements = (pulse.movements ?? [])
      .map((m) => {
        const text = `${m.title} ${m.title_bn} ${m.place} ${m.theme} ${m.summary_en} ${m.summary_bn}`;
        const match = matchEntity(code, m.district, m.division, text);
        return { m, match };
      })
      .filter((x) => x.match.hit)
      .map(({ m, match }) => {
        const hint = unrestOpsHint(m.theme_id);
        return {
          id: m.id,
          title: m.title,
          titleBn: m.title_bn,
          themeId: m.theme_id,
          theme: m.theme,
          themeBn: m.theme_bn,
          place: m.place,
          placeBn: m.place_bn,
          district: m.district,
          status: m.status,
          eventAt: m.event_at,
          lastSeenAt: m.last_seen_at,
          articleCount: m.article_count,
          severity: m.severity,
          lat: m.lat,
          lng: m.lng,
          local: match.local,
          solutionEn: hint.en,
          solutionBn: hint.bn,
        };
      })
      .sort((a, b) => Number(b.local) - Number(a.local) || b.severity - a.severity);

    const signals = pulse.signals
      .map((s) => {
        const match = matchEntity(code, s.district, s.division, `${s.title} ${s.title_bn_hint}`);
        return { s, match };
      })
      .filter((x) => x.match.hit)
      .map(({ s, match }) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        categoryBn: s.category_bn,
        severity: s.severity,
        district: s.district,
        publishedAt: s.published_at,
        url: s.url,
        local: match.local,
      }));

    const last24h = signals.filter((s) => {
      const h = hoursAgo(s.publishedAt);
      return h != null && h <= 24;
    }).length;
    const last7d = signals.filter((s) => {
      const h = hoursAgo(s.publishedAt);
      return h != null && h <= 24 * 7;
    }).length;
    const prev6d = Math.max(0, last7d - last24h);
    const daily = prev6d / 6;
    let trend: "rising" | "stable" | "falling" = "stable";
    if (last24h > daily + 1) trend = "rising";
    else if (last24h + 1 < daily) trend = "falling";

    const tagMap = new Map<string, { id: string; labelEn: string; labelBn: string; count: number }>();
    for (const m of movements) {
      const cur = tagMap.get(m.themeId) ?? {
        id: m.themeId,
        labelEn: m.theme,
        labelBn: m.themeBn,
        count: 0,
      };
      cur.count += 1;
      tagMap.set(m.themeId, cur);
    }
    for (const s of signals) {
      const cur = tagMap.get(s.category) ?? {
        id: s.category,
        labelEn: s.category,
        labelBn: s.categoryBn,
        count: 0,
      };
      cur.count += 1;
      tagMap.set(s.category, cur);
    }

    const wards = await prismaRead.adminUnit.findMany({
      where: { parentId: entityId, type: AdminUnitType.WARD },
      select: { id: true },
      take: 1,
    });

    const pins = movements
      .filter((m) => m.status === "active" || m.status === "recent")
      .slice(0, 24)
      .map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        severity: m.severity,
        label: m.titleBn || m.title,
        themeId: m.themeId,
        local: m.local,
        wardId: wards[0]?.id ?? null,
        occurredAt: m.eventAt || m.lastSeenAt,
      }));

    return {
      entityId,
      entityCode: entity.code,
      entityName: entity.name,
      entityNameBn: entity.nameBn,
      generatedAt: new Date().toISOString(),
      sourceNote:
        "National unrest pulse geo-filtered to this desk — news-derived, not an official police feed.",
      summary: {
        active: movements.filter((m) => m.status === "active").length,
        last24h,
        last7d,
        trend,
        localHits: movements.filter((m) => m.local).length + signals.filter((s) => s.local).length,
        signalCount: signals.length,
      },
      tags: [...tagMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
      movements: movements.slice(0, 20),
      signals: signals.slice(0, 30),
      pins,
    };
  }
}

export const localUnrestService = new LocalUnrestService();
