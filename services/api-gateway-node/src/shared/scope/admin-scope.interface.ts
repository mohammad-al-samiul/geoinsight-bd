import { AdminUnitType, UserRole } from "@prisma/client";

export interface AdminUnitNode {
  id: string;
  type: AdminUnitType;
  parentId: string | null;
}

export interface IAdminScopeService {
  getAncestorChain(unitId: string): Promise<AdminUnitNode[]>;
  isWithinScope(
    userUnitId: string | null,
    userRole: UserRole,
    targetUnitId: string,
  ): Promise<boolean>;
  assertRoleMatchesUnitType(role: UserRole, unitType: AdminUnitType): void;
}
