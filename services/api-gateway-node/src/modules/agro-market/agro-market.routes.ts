import { Router } from "express";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { listAgroMarketsSchema } from "./agro-market.validator";
import { AgroMarketController } from "./agro-market.controller";

export function createAgroMarketRoutes(
  controller: AgroMarketController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate(),
    validate(listAgroMarketsSchema, "query"),
    rbac.authorize({ unitIdKey: "unitId", source: "query", requireUnit: false }),
    controller.list,
  );

  return router;
}
