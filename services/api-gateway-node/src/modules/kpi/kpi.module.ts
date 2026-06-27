import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { KpiService } from "./kpi.service";
import { KpiController } from "./kpi.controller";
import { createKpiRoutes } from "./kpi.routes";

export class KpiModule extends BaseModule {
  readonly name = "kpi";

  private readonly service = new KpiService();
  private readonly controller = new KpiController(this.service);

  register(router: Router): void {
    router.use("/kpis", createKpiRoutes(this.controller, this.service, container.rbac));
  }
}

export const kpiModule = new KpiModule();
