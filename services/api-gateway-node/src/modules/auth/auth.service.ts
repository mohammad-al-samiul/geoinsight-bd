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
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotp,
} from "../../shared/security/totp";
import { RegisterDto } from "./auth.validator";
import { jwtSessionService } from "../../infrastructure/session/jwt-session.service";

const BCRYPT_ROUNDS = 12;
const MFA_TOKEN_EXPIRES = "5m";

interface MfaChallengePayload {
  sub: string;
  purpose: "mfa";
}

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

  private issueMfaChallenge(userId: string): string {
    const payload: MfaChallengePayload = { sub: userId, purpose: "mfa" };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: MFA_TOKEN_EXPIRES,
      jwtid: crypto.randomUUID(),
    });
  }

  private async issueSession(user: {
    id: string;
    email: string;
    phone: string | null;
    role: UserRole;
    adminUnitId: string | null;
  }) {
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
        role: user.role,
        adminUnitId: user.adminUnitId,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await prismaRead.user.findUnique({ where: { email } });
    if (!user?.isActive) throw ApiError.unauthorized("Invalid credentials");

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    if (user.mfaSecret) {
      return {
        requiresMfa: true as const,
        mfaToken: this.issueMfaChallenge(user.id),
        user: {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
        },
      };
    }

    const session = await this.issueSession(user);
    return {
      requiresMfa: false as const,
      ...session,
      user: { ...session.user, mfaEnabled: false },
    };
  }

  async verifyMfa(mfaToken: string, code: string) {
    let challenge: MfaChallengePayload;
    try {
      challenge = jwt.verify(mfaToken, env.JWT_SECRET) as MfaChallengePayload;
    } catch {
      throw ApiError.unauthorized("Invalid or expired MFA challenge");
    }
    if (challenge.purpose !== "mfa" || !challenge.sub) {
      throw ApiError.unauthorized("Invalid MFA challenge");
    }

    const user = await prismaRead.user.findUnique({ where: { id: challenge.sub } });
    if (!user?.isActive || !user.mfaSecret) {
      throw ApiError.unauthorized("MFA not available for this account");
    }
    if (!verifyTotp(user.mfaSecret, code)) {
      throw ApiError.unauthorized("Invalid authenticator code");
    }

    const session = await this.issueSession(user);
    return {
      requiresMfa: false as const,
      ...session,
      user: { ...session.user, mfaEnabled: true },
    };
  }

  async setupMfa(userId: string) {
    const user = await prismaRead.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaSecret: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    if (user.mfaSecret) {
      throw ApiError.conflict("MFA already enabled — disable first to rotate");
    }

    const secret = generateTotpSecret();
    return {
      secret,
      otpauthUrl: buildOtpAuthUrl({ secret, email: user.email }),
      issuer: "GeoInsight BD",
    };
  }

  async enableMfa(userId: string, secret: string, code: string) {
    const user = await prismaRead.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    if (user.mfaSecret) throw ApiError.conflict("MFA already enabled");
    if (!verifyTotp(secret, code)) {
      throw ApiError.badRequest("Invalid authenticator code — check clock sync");
    }

    await prismaWrite.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string, code: string) {
    const user = await prismaRead.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    if (!user.mfaSecret) throw ApiError.badRequest("MFA is not enabled");
    if (!verifyTotp(user.mfaSecret, code)) {
      throw ApiError.unauthorized("Invalid authenticator code");
    }

    await prismaWrite.user.update({
      where: { id: userId },
      data: { mfaSecret: null },
    });
    return { mfaEnabled: false };
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
        mfaSecret: true,
        adminUnit: { select: { id: true, name: true, type: true } },
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    const { mfaSecret, ...rest } = user;
    return { ...rest, mfaEnabled: Boolean(mfaSecret) };
  }
}
