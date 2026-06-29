import { Router, Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { createKpiRecordSchema, listKpiRecordsSchema, CreateKpiRecordDto } from "./kpi.validator";
import { KpiController } from "./kpi.controller";
import { KpiService } from "./kpi.service";

function scopeByRepresentative(service: KpiService, rbac: RbacMiddleware) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateKpiRecordDto;
      const adminUnitId = await service.resolveAdminUnitId(dto.representativeId);
      (req.body as CreateKpiRecordDto & { adminUnitId: string }).adminUnitId = adminUnitId;
      return rbac.authorize({ unitIdKey: "adminUnitId", source: "body" })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function createKpiRoutes(
  controller: KpiController,
  service: KpiService,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get("/definitions", authenticate(), controller.listDefinitions);
  router.get(
    "/records",
    authenticate(),
    validate(listKpiRecordsSchema, "query"),
    rbac.authorize({ unitIdKey: "unitId", source: "query", requireUnit: false }),
    controller.listRecords,
  );
  router.post(
    "/records",
    authenticate(),
    rbac.requireRoles(UserRole.PMO, UserRole.DC, UserRole.UNION_CHAIRMAN),
    validate(createKpiRecordSchema),
    scopeByRepresentative(service, rbac),
    controller.createRecord,
  );

  return router;
}
