import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { AdminUnitService } from "./admin-unit.service";
import { AdminUnitController } from "./admin-unit.controller";
import { createAdminUnitRoutes } from "./admin-unit.routes";

export class AdminUnitModule extends BaseModule {
  readonly name = "admin-unit";

  private readonly service = new AdminUnitService();
  private readonly controller = new AdminUnitController(this.service);

  register(router: Router): void {
    router.use("/admin-units", createAdminUnitRoutes(this.controller, container.rbac));
  }
}

export const adminUnitModule = new AdminUnitModule();
