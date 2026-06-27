import { prisma } from "../../core/database/prisma.client";

export class AgroMarketService {
  async listByUnit(unitId: string) {
    return prisma.agroMarket.findMany({
      where: { adminUnitId: unitId },
      select: { id: true, name: true, lat: true, lng: true, type: true, adminUnitId: true },
      orderBy: { name: "asc" },
    });
  }
}
