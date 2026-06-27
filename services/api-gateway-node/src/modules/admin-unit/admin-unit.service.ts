import { prisma } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";

export class AdminUnitService {
  async getById(unitId: string) {
    const unit = await prisma.adminUnit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        name: true,
        nameBn: true,
        type: true,
        parentId: true,
        path: true,
        geoJson: true,
      },
    });
    if (!unit) throw ApiError.notFound("Admin unit not found");
    return unit;
  }

  async getTree(unitId: string) {
    const unit = await prisma.adminUnit.findUnique({
      where: { id: unitId },
      include: {
        children: {
          include: {
            children: { include: { children: true } },
          },
        },
      },
    });
    if (!unit) throw ApiError.notFound("Admin unit not found");
    return unit;
  }

  async listByType(type?: string) {
    return prisma.adminUnit.findMany({
      where: type ? { type: type as never } : undefined,
      select: { id: true, name: true, nameBn: true, type: true, parentId: true },
      orderBy: { name: "asc" },
    });
  }
}
