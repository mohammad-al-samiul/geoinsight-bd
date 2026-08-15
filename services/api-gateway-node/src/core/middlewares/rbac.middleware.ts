import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { ApiError } from "../../core/errors/api.error";
import { IAdminScopeService } from "../../shared/scope/admin-scope.interface";

type UnitIdSource = "params" | "query" | "body";

export interface RbacOptions {
  roles?: UserRole[];
  unitIdKey?: string;
  source?: UnitIdSource;
  requireUnit?: boolean;
}

export class RbacMiddleware {
  constructor(private readonly scopeService: IAdminScopeService) {}

  authorize = (options: RbacOptions = {}) =>
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = req.user;
        if (!user) {
          next(ApiError.unauthorized());
          return;
        }

        if (options.roles && !options.roles.includes(user.role)) {
          next(ApiError.forbidden());
          return;
        }

        const source = options.source ?? "params";
        const unitIdKey = options.unitIdKey ?? "unitId";
        const targetUnitId = (req[source] as Record<string, unknown>)[unitIdKey] as
          | string
          | undefined;

        if (!targetUnitId) {
          if (options.requireUnit !== false) {
            next(ApiError.badRequest(`Missing ${unitIdKey}`));
            return;
          }
          // Scoped roles (minister / DC / union / MP / mayor) must not read the
          // whole country when the client omits unitId.
          if (user.role !== UserRole.PMO && user.adminUnitId) {
            const bag = req[source] as Record<string, unknown>;
            bag[unitIdKey] = user.adminUnitId;
          }
          next();
          return;
        }

        const allowed = await this.scopeService.isWithinScope(
          user.adminUnitId,
          user.role,
          targetUnitId,
        );

        if (!allowed) {
          next(ApiError.forbidden("Target unit is outside your administrative scope"));
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    };

  requireRoles =
    (...roles: UserRole[]) =>
    (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user || !roles.includes(req.user.role)) {
        next(ApiError.forbidden());
        return;
      }
      next();
    };
}
