import { AdminUnitType } from "@prisma/client";
import { ApiError } from "../../core/errors/api.error";
import { adminHierarchyCache } from "../../infrastructure/cache/admin-hierarchy.cache";
import { prismaRead } from "../../core/database/prisma.client";

export class AdminUnitService {
  /** Full Bangladesh hierarchy — Redis cache-aside (24h TTL). */
  async getFullHierarchy() {
    return adminHierarchyCache.getFullHierarchy();
  }

  async getById(unitId: string) {
    const unit = await prismaRead.adminUnit.findUnique({
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
    const cached = await adminHierarchyCache.getTree(unitId);
    if (!cached) throw ApiError.notFound("Admin unit not found");
    return cached;
  }

  async listByType(type?: string) {
    return prismaRead.adminUnit.findMany({
      where: type ? { type: type as AdminUnitType } : undefined,
      select: { id: true, name: true, nameBn: true, type: true, parentId: true },
      orderBy: { name: "asc" },
    });
  }
}
