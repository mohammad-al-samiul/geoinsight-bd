import { Router } from "express";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { unitIdParamSchema } from "./admin-unit.validator";
import { AdminUnitController } from "./admin-unit.controller";

export function createAdminUnitRoutes(
  controller: AdminUnitController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get(
    "/hierarchy/full",
    authenticate(),
    controller.getFullHierarchy,
  );

  router.get(
    "/:unitId/tree",
    authenticate(),
    validate(unitIdParamSchema, "params"),
    rbac.authorize({ unitIdKey: "unitId", source: "params" }),
    controller.getTree,
  );

  router.get(
    "/:unitId",
    authenticate(),
    validate(unitIdParamSchema, "params"),
    rbac.authorize({ unitIdKey: "unitId", source: "params" }),
    controller.getById,
  );

  return router;
}
