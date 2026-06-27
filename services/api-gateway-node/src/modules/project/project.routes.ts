import { Router } from "express";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import { listProjectsSchema, projectIdParamSchema } from "./project.validator";
import { ProjectController } from "./project.controller";

export function createProjectRoutes(
  controller: ProjectController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate(),
    validate(listProjectsSchema, "query"),
    rbac.authorize({ unitIdKey: "unitId", source: "query" }),
    controller.list,
  );

  router.get(
    "/:projectId",
    authenticate(),
    validate(projectIdParamSchema, "params"),
    controller.getById,
  );

  return router;
}
