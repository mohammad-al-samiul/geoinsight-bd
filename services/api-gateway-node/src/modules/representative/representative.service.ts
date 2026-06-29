import { prismaRead } from "../../core/database/prisma.client";

import { representativeUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListRepresentativesQuery } from "./representative.validator";

export class RepresentativeService {
  async list(query: ListRepresentativesQuery) {
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
