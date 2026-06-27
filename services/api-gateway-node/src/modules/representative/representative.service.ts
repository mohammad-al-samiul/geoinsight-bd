import { prismaRead } from "../../core/database/prisma.client";

export class RepresentativeService {
  async listByUnit(unitId: string) {
    return prismaRead.representative.findMany({
      where: { adminUnitId: unitId },
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
