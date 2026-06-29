import { Router } from "express";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { listRepresentativesSchema } from "./representative.validator";
import { RepresentativeController } from "./representative.controller";

export function createRepresentativeRoutes(
  controller: RepresentativeController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate(),
    validate(listRepresentativesSchema, "query"),
    rbac.authorize({ unitIdKey: "unitId", source: "query", requireUnit: false }),
    controller.list,
  );

  return router;
}
