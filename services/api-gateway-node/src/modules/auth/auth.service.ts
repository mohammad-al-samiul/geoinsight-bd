import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "../../core/database/prisma.client";
import { env } from "../../core/config/env";
import { NATIONAL_ROLES } from "../../core/constants/rbac";
import { ApiError } from "../../core/errors/api.error";
import { JwtPayload } from "../../core/types/express";
import { IAuditService } from "../../shared/audit/audit.service";
import { IAdminScopeService } from "../../shared/scope/admin-scope.interface";
import { RegisterDto } from "./auth.validator";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(
    private readonly scopeService: IAdminScopeService,
    private readonly auditService: IAuditService,
  ) {}

  async register(input: RegisterDto, actorId: string, ip?: string) {
    if (await prisma.user.findUnique({ where: { email: input.email } })) {
      throw ApiError.conflict("Email already registered");
    }

    if (!NATIONAL_ROLES.includes(input.role) && !input.adminUnitId) {
      throw ApiError.badRequest("adminUnitId required for this role");
    }

    if (input.adminUnitId) {
      const unit = await prisma.adminUnit.findUnique({ where: { id: input.adminUnitId } });
      if (!unit) throw ApiError.notFound("Admin unit not found");
      this.scopeService.assertRoleMatchesUnitType(input.role, unit.type);
    }

    const user = await prisma.user.create({
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

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.isActive) throw ApiError.unauthorized("Invalid credentials");

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      adminUnitId: user.adminUnitId,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        adminUnitId: user.adminUnitId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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
