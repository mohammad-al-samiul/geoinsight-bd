import { AdminUnitType, UserRole } from "@prisma/client";
import { prisma } from "../../core/database/prisma.client";
import { NATIONAL_ROLES, ROLE_UNIT_TYPE } from "../../core/constants/rbac";
import { ApiError } from "../../core/errors/api.error";
import { AdminUnitNode, IAdminScopeService } from "./admin-scope.interface";

export class AdminScopeService implements IAdminScopeService {
  async getAncestorChain(unitId: string): Promise<AdminUnitNode[]> {
    const chain: AdminUnitNode[] = [];
    let currentId: string | null = unitId;

    while (currentId) {
      const unit: AdminUnitNode | null = await prisma.adminUnit.findUnique({
        where: { id: currentId },
        select: { id: true, type: true, parentId: true },
      });
      if (!unit) break;
      chain.push(unit);
      currentId = unit.parentId;
    }

    return chain;
  }

  async isWithinScope(
    userUnitId: string | null,
    userRole: UserRole,
    targetUnitId: string,
  ): Promise<boolean> {
    if (NATIONAL_ROLES.includes(userRole)) return true;
    if (!userUnitId) return false;
    if (userUnitId === targetUnitId) return true;

    const ancestors = await this.getAncestorChain(targetUnitId);
    return ancestors.some((node) => node.id === userUnitId);
  }

  assertRoleMatchesUnitType(role: UserRole, unitType: AdminUnitType): void {
    const required = ROLE_UNIT_TYPE[role];
    if (required === null) return;
    if (required !== unitType) {
      throw ApiError.badRequest(
        `Role ${role} must be scoped to a ${required} admin unit`,
      );
    }
  }
}

export const adminScopeService = new AdminScopeService();
