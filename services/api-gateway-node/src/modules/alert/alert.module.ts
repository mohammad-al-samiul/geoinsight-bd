import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { AlertService } from "./alert.service";
import { AlertController } from "./alert.controller";
import { createAlertRoutes } from "./alert.routes";

export class AlertModule extends BaseModule {
  readonly name = "alert";

  private readonly service = new AlertService(container.auditService);
  private readonly controller = new AlertController(this.service);

  register(router: Router): void {
    router.use("/alerts", createAlertRoutes(this.controller, container.rbac));
  }
}

export const alertModule = new AlertModule();
