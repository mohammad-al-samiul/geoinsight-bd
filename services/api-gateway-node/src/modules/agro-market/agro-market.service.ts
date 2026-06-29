import { prismaRead } from "../../core/database/prisma.client";

import { agroMarketUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListAgroMarketsQuery } from "./agro-market.validator";

export class AgroMarketService {
  async list(query: ListAgroMarketsQuery) {
    return prismaRead.agroMarket.findMany({
      where: {
        ...(query.unitId && agroMarketUnitScopeWhere(query.unitId)),
      },
      select: { id: true, name: true, lat: true, lng: true, type: true, adminUnitId: true },
      orderBy: { name: "asc" },
    });
  }
}
