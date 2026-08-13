import {
  LocalPulseEventKind,
  UserRole,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import {
  assertWardBelongsToEntity,
  resolveLocalEntityId,
} from "./local-entity.scope";

export class LocalPulseEventService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; days?: number } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const days = Math.min(opts.days ?? 30, 90);
    const from = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    const to = new Date(Date.now() + days * 24 * 60 * 60_000);

    const items = await prismaRead.localPulseEvent.findMany({
      where: {
        entityId,
        startsAt: { gte: from, lte: to },
      },
      orderBy: { startsAt: "asc" },
      take: 80,
      include: {
        influencer: {
          select: { id: true, name: true, nameBn: true, roleType: true },
        },
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    return {
      entityId,
      generatedAt: new Date().toISOString(),
      summary: {
        upcoming: items.filter((i) => !i.done && i.startsAt.getTime() >= Date.now()).length,
        done: items.filter((i) => i.done).length,
        withInfluencer: items.filter((i) => i.influencerId).length,
      },
      items,
    };
  }

  async create(
    user: { id: string; role: UserRole; adminUnitId: string | null },
    input: {
      entityId?: string;
      wardId?: string;
      influencerId?: string;
      kind?: LocalPulseEventKind;
      title: string;
      titleBn?: string;
      detail?: string;
      startsAt: string;
      endsAt?: string;
      locationLabel?: string;
    },
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    if (input.wardId) await assertWardBelongsToEntity(input.wardId, entityId);
    if (input.influencerId) {
      const inf = await prismaRead.localInfluencer.findFirst({
        where: { id: input.influencerId, entityId },
      });
      if (!inf) throw ApiError.badRequest("Influencer not in this entity");
    }

    return prismaWrite.localPulseEvent.create({
      data: {
        entityId,
        wardId: input.wardId || null,
        influencerId: input.influencerId || null,
        kind: input.kind ?? LocalPulseEventKind.OTHER,
        title: input.title.trim(),
        titleBn: input.titleBn?.trim() || null,
        detail: input.detail?.trim() || null,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        locationLabel: input.locationLabel?.trim() || null,
        createdById: user.id,
      },
      include: {
        influencer: {
          select: { id: true, name: true, nameBn: true, roleType: true },
        },
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
  }

  async markDone(
    user: { role: UserRole; adminUnitId: string | null },
    eventId: string,
    done = true,
  ) {
    const row = await prismaRead.localPulseEvent.findUnique({ where: { id: eventId } });
    if (!row) throw ApiError.notFound("Event not found");
    await resolveLocalEntityId(user, row.entityId);
    return prismaWrite.localPulseEvent.update({
      where: { id: eventId },
      data: { done },
    });
  }
}

export const localPulseEventService = new LocalPulseEventService();
