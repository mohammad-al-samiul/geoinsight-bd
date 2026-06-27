import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { buildJwtPayload } from "./fixtures";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signTestToken(role: UserRole, adminUnitId: string | null = null): string {
  return jwt.sign(buildJwtPayload(role, adminUnitId), JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function authHeader(role: UserRole, adminUnitId: string | null = null): {
  Authorization: string;
} {
  return { Authorization: `Bearer ${signTestToken(role, adminUnitId)}` };
}
