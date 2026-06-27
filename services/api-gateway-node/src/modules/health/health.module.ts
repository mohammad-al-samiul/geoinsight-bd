import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";

export class HealthModule extends BaseModule {
  readonly name = "health";

  register(router: Router): void {
    router.get("/health", (_req, res) => {
      res.json({ success: true, service: "geoinsight-api-gateway", status: "healthy" });
    });
  }
}

export const healthModule = new HealthModule();
