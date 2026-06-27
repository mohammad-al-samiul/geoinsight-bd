import { AdminUnitType, UserRole } from "@prisma/client";

export const NATIONAL_ROLES: UserRole[] = [UserRole.PMO];

export const ROLE_UNIT_TYPE: Record<UserRole, AdminUnitType | null> = {
  [UserRole.PMO]: null,
  [UserRole.MINISTER]: AdminUnitType.DIVISION,
  [UserRole.DC]: AdminUnitType.DISTRICT,
  [UserRole.UNION_CHAIRMAN]: AdminUnitType.UNION,
};
