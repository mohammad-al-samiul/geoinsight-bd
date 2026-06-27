import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { ProjectService } from "./project.service";
import { ProjectController } from "./project.controller";
import { createProjectRoutes } from "./project.routes";

export class ProjectModule extends BaseModule {
  readonly name = "project";

  private readonly service = new ProjectService();
  private readonly controller = new ProjectController(this.service);

  register(router: Router): void {
    router.use("/projects", createProjectRoutes(this.controller, container.rbac));
  }
}

export const projectModule = new ProjectModule();
