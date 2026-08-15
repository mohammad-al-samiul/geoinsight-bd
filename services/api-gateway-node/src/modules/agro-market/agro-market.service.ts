import { prismaRead } from "../../core/database/prisma.client";

import { agroMarketUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListAgroMarketsQuery } from "./agro-market.validator";

export class AgroMarketService {
  async list(query: ListAgroMarketsQuery) {
    const rows = await prismaRead.agroMarket.findMany({
      where: {
        ...(query.unitId && agroMarketUnitScopeWhere(query.unitId)),
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        type: true,
        adminUnitId: true,
        commodityCode: true,
        priceBdtPerKg: true,
        priceUpdatedAt: true,
      },
      orderBy: { name: "asc" },
      take: 1000,
    });
    return rows.map((row) => ({ ...row, provenance: "SEED" as const }));
  }
}

export const agroMarketService = new AgroMarketService();
