import { prismaRead } from "../../core/database/prisma.client";
import { env } from "../../core/config/env";
import { liveDataService } from "../live-data/live-data.service";
import { representativeUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListRepresentativesQuery } from "./representative.validator";

export class RepresentativeService {
  async list(query: ListRepresentativesQuery) {
    if (env.LIVE_DATA_ONLY) {
      return liveDataService.listRepresentatives(
        query.unitId ? { districtId: query.unitId } : {},
      );
    }

    return prismaRead.representative.findMany({
      where: {
        ...(query.unitId && representativeUnitScopeWhere(query.unitId)),
      },
      select: {
        id: true,
        name: true,
        nid: true,
        role: true,
        party: true,
        tenureStart: true,
        tenureEnd: true,
        adminUnitId: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
