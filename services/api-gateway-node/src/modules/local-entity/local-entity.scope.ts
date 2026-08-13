import { AdminUnitType, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { isLocalEntityRole, NATIONAL_ROLES } from "../../core/constants/rbac";
import { adminScopeService } from "../../shared/scope/admin-scope.service";
import { LOCAL_ENTITY_CODES } from "./local-entity.catalog";

const LOCAL_ROOT_TYPES: AdminUnitType[] = [
  AdminUnitType.CONSTITUENCY,
  AdminUnitType.CITY_CORPORATION,
];

export async function resolveLocalEntityId(
  user: { role: UserRole; adminUnitId: string | null },
  entityId?: string,
): Promise<string> {
  if (isLocalEntityRole(user.role)) {
    if (!user.adminUnitId) {
      throw ApiError.forbidden("Local role missing admin unit scope");
    }
    if (entityId && entityId !== user.adminUnitId) {
      const allowed = await adminScopeService.isWithinScope(
        user.adminUnitId,
        user.role,
        entityId,
      );
      if (!allowed) throw ApiError.forbidden("Outside your local entity scope");
      const unit = await prismaRead.adminUnit.findUnique({ where: { id: entityId } });
      if (unit?.type === AdminUnitType.WARD && unit.parentId) return unit.parentId;
      if (unit && LOCAL_ROOT_TYPES.includes(unit.type)) return unit.id;
      throw ApiError.badRequest("Invalid entity id for local scope");
    }
    return user.adminUnitId;
  }

  if (NATIONAL_ROLES.includes(user.role)) {
    if (entityId) {
      const unit = await prismaRead.adminUnit.findUnique({ where: { id: entityId } });
      if (!unit || !LOCAL_ROOT_TYPES.includes(unit.type)) {
        throw ApiError.badRequest("entityId must be a constituency or city corporation");
      }
      return unit.id;
    }
    const first = await prismaRead.adminUnit.findFirst({
      where: { type: { in: LOCAL_ROOT_TYPES }, code: { in: LOCAL_ENTITY_CODES } },
      orderBy: { code: "asc" },
    });
    if (!first) throw ApiError.notFound("No local entities seeded yet");
    return first.id;
  }

  throw ApiError.forbidden("Role cannot access local entity modules");
}

export async function assertWardBelongsToEntity(
  wardId: string,
  entityId: string,
): Promise<{ id: string; parentId: string | null; type: AdminUnitType }> {
  const ward = await prismaRead.adminUnit.findUnique({
    where: { id: wardId },
    select: { id: true, parentId: true, type: true },
  });
  if (!ward || ward.type !== AdminUnitType.WARD) {
    throw ApiError.badRequest("wardId must reference a WARD admin unit");
  }
  if (ward.parentId !== entityId) {
    throw ApiError.badRequest("Ward does not belong to this local entity");
  }
  return ward;
}

export function currentPeriodKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
