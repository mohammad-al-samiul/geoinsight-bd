import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { RepresentativeService } from "./representative.service";
import { RepresentativeController } from "./representative.controller";
import { createRepresentativeRoutes } from "./representative.routes";

export class RepresentativeModule extends BaseModule {
  readonly name = "representative";

  private readonly service = new RepresentativeService();
  private readonly controller = new RepresentativeController(this.service);

  register(router: Router): void {
    router.use(
      "/representatives",
      createRepresentativeRoutes(this.controller, container.rbac),
    );
  }
}

export const representativeModule = new RepresentativeModule();
