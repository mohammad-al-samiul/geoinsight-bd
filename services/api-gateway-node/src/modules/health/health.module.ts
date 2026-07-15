import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import {
  getLiveness,
  getReadiness,
  readinessHttpStatus,
} from "./health.service";

export class HealthModule extends BaseModule {
  readonly name = "health";

  register(router: Router): void {
    router.get("/health", async (_req, res) => {
      const report = await getReadiness();
      res.status(readinessHttpStatus(report)).json({
        success: report.status !== "unhealthy",
        ...report,
      });
    });

    router.get("/health/live", async (_req, res) => {
      res.json(await getLiveness());
    });

    router.get("/health/ready", async (_req, res) => {
      const report = await getReadiness();
      res.status(readinessHttpStatus(report)).json({
        success: report.status !== "unhealthy",
        ...report,
      });
    });
  }
}

export const healthModule = new HealthModule();
