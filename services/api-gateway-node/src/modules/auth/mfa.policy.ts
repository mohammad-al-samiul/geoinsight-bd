import { UserRole } from "@prisma/client";
import { env } from "../../core/config/env";

const ROLES = new Set<string>(Object.values(UserRole));

export function mfaRequiredRoles(): UserRole[] {
  return env.MFA_REQUIRED_ROLES.split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is UserRole => ROLES.has(s));
}

export function isMfaRequiredRole(role: UserRole): boolean {
  return mfaRequiredRoles().includes(role);
}

export function mfaPolicyFor(role: UserRole, mfaEnabled: boolean) {
  const required = isMfaRequiredRole(role);
  return {
    mfaRequired: required,
    mfaEnabled,
    mfaEnforced: required && env.MFA_ENFORCE,
  };
}
