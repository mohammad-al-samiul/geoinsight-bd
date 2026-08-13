import { LocalInfluencerRole, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";

export class LocalPulseService {
  async getPulse(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; wardId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);

    const influencerWhere = {
      entityId,
      isActive: true,
      ...(opts.wardId ? { wardId: opts.wardId } : {}),
    };
    const pollingWhere = {
      entityId,
      ...(opts.wardId ? { wardId: opts.wardId } : {}),
    };

    const [influencers, pollingCenters] = await Promise.all([
      prismaRead.localInfluencer.findMany({
        where: influencerWhere,
        orderBy: [{ influenceScore: "desc" }, { name: "asc" }],
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      }),
      prismaRead.localPollingCenter.findMany({
        where: pollingWhere,
        orderBy: [{ newVoters: "desc" }, { name: "asc" }],
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const role of Object.values(LocalInfluencerRole)) byRole[role] = 0;
    for (const inf of influencers) {
      byRole[inf.roleType] = (byRole[inf.roleType] ?? 0) + 1;
    }

    const registeredVoters = pollingCenters.reduce(
      (s, p) => s + p.registeredVoters,
      0,
    );
    const newVoters = pollingCenters.reduce((s, p) => s + p.newVoters, 0);

    return {
      entityId,
      summary: {
        influencerCount: influencers.length,
        pollingCenterCount: pollingCenters.length,
        registeredVoters,
        newVoters,
        newVoterPct:
          registeredVoters > 0
            ? Math.round((newVoters / registeredVoters) * 1000) / 10
            : 0,
        byRole,
      },
      influencers,
      pollingCenters,
    };
  }
}

export const localPulseService = new LocalPulseService();
