import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prismaWrite, prismaRead } from "../../core/database/prisma.client";
import { env } from "../../core/config/env";
import { NATIONAL_ROLES } from "../../core/constants/rbac";
import { ApiError } from "../../core/errors/api.error";
import { JwtPayload } from "../../core/types/express";
import { IAuditService } from "../../shared/audit/audit.service";
import { IAdminScopeService } from "../../shared/scope/admin-scope.interface";
import { RegisterDto } from "./auth.validator";
import { jwtSessionService } from "../../infrastructure/session/jwt-session.service";

const BCRYPT_ROUNDS = 12;

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    jwtid: crypto.randomUUID(),
  });
}

function userPayload(user: {
  id: string;
  email: string;
  role: UserRole;
  adminUnitId: string | null;
}): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    adminUnitId: user.adminUnitId,
  };
}

export class AuthService {
  constructor(
    private readonly scopeService: IAdminScopeService,
    private readonly auditService: IAuditService,
  ) {}

  async register(input: RegisterDto, actorId: string, ip?: string) {
    if (await prismaWrite.user.findUnique({ where: { email: input.email } })) {
      throw ApiError.conflict("Email already registered");
    }

    if (!NATIONAL_ROLES.includes(input.role) && !input.adminUnitId) {
      throw ApiError.badRequest("adminUnitId required for this role");
    }

    if (input.adminUnitId) {
      const unit = await prismaRead.adminUnit.findUnique({ where: { id: input.adminUnitId } });
      if (!unit) throw ApiError.notFound("Admin unit not found");
      this.scopeService.assertRoleMatchesUnitType(input.role, unit.type);
    }

    const user = await prismaWrite.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        role: input.role,
        adminUnitId: input.adminUnitId ?? null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        adminUnitId: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      userId: actorId,
      action: "CREATE",
      tableName: "users",
      recordId: user.id,
      newValue: { email: user.email, role: user.role },
      ipAddress: ip,
    });

    return user;
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRES_DAYS);

    await prismaWrite.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    return refreshToken;
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    await prismaWrite.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async login(email: string, password: string) {
    const user = await prismaRead.user.findUnique({ where: { email } });
    if (!user?.isActive) throw ApiError.unauthorized("Invalid credentials");

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const accessToken = issueAccessToken(userPayload(user));
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        adminUnitId: user.adminUnitId,
      },
    };
  }

  async refresh(refreshToken: string) {
    const record = await prismaWrite.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            adminUnitId: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    await prismaWrite.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = issueAccessToken(userPayload(record.user));
    const newRefreshToken = await this.createRefreshToken(record.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      user: {
        id: record.user.id,
        email: record.user.email,
        phone: record.user.phone,
        role: record.user.role,
        adminUnitId: record.user.adminUnitId,
      },
    };
  }

  async logout(refreshToken: string, accessToken?: string) {
    await this.revokeRefreshToken(refreshToken);
    if (accessToken) {
      await jwtSessionService.blacklistAccessToken(accessToken);
    }
    return { success: true };
  }

  /** Force logout across all gateway replicas (role revocation, security incident). */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await jwtSessionService.revokeUserSessions(userId);
    await prismaWrite.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await prismaRead.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        adminUnitId: true,
        adminUnit: { select: { id: true, name: true, type: true } },
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    return user;
  }
}
