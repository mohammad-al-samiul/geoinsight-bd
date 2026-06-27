import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { listAlertsSchema, resolveAlertSchema } from "./alert.validator";
import { AlertController } from "./alert.controller";

export function createAlertRoutes(
  controller: AlertController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate(),
    validate(listAlertsSchema, "query"),
    rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
    controller.list,
  );

  router.patch(
    "/:alertId/resolve",
    authenticate(),
    validate(resolveAlertSchema, "params"),
    rbac.requireRoles(UserRole.PMO, UserRole.DC),
    controller.resolve,
  );

  return router;
}
