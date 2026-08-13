import { AdminUnitType, UserRole } from "@prisma/client";

export const NATIONAL_ROLES: UserRole[] = [UserRole.PMO];

/** Roles that use the local entity (MP / Mayor) DSS surface */
export const LOCAL_ENTITY_ROLES: UserRole[] = [UserRole.MP, UserRole.MAYOR];

export const ROLE_UNIT_TYPE: Record<UserRole, AdminUnitType | null> = {
  [UserRole.PMO]: null,
  [UserRole.MINISTER]: AdminUnitType.DIVISION,
  [UserRole.DC]: AdminUnitType.DISTRICT,
  [UserRole.UNION_CHAIRMAN]: AdminUnitType.UNION,
  [UserRole.MP]: AdminUnitType.CONSTITUENCY,
  [UserRole.MAYOR]: AdminUnitType.CITY_CORPORATION,
};

export function isLocalEntityRole(role: UserRole): boolean {
  return LOCAL_ENTITY_ROLES.includes(role);
}
