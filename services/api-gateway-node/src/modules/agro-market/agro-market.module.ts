import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { AgroMarketService } from "./agro-market.service";
import { AgroMarketController } from "./agro-market.controller";
import { createAgroMarketRoutes } from "./agro-market.routes";

export class AgroMarketModule extends BaseModule {
  readonly name = "agro-market";

  private readonly service = new AgroMarketService();
  private readonly controller = new AgroMarketController(this.service);

  register(router: Router): void {
    router.use(
      "/agro-markets",
      createAgroMarketRoutes(this.controller, container.rbac),
    );
  }
}

export const agroMarketModule = new AgroMarketModule();
