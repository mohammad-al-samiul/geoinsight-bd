import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import {
  queueIdParamSchema,
  submitMilestoneSchema,
} from "./blockchain.validator";
import { BlockchainController } from "./blockchain.controller";

export function createBlockchainRoutes(
  controller: BlockchainController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get("/health", authenticate(), controller.fabricHealth);

  router.post(
    "/milestones",
    authenticate(),
    rbac.requireRoles(UserRole.PMO, UserRole.DC, UserRole.UNION_CHAIRMAN),
    validate(submitMilestoneSchema),
    controller.submitMilestone,
  );

  router.get(
    "/queue/:queueId",
    authenticate(),
    rbac.requireRoles(UserRole.PMO, UserRole.DC),
    validate(queueIdParamSchema, "params"),
    controller.getQueueStatus,
  );

  router.post(
    "/queue/retry",
    authenticate(),
    rbac.requireRoles(UserRole.PMO),
    controller.retryNow,
  );

  return router;
}
