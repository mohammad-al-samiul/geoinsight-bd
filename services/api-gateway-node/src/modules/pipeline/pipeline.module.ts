import { Router } from "express";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { pipelineOrchestrator } from "./pipeline.orchestrator";
import { pipelineService } from "./pipeline.service";

export class PipelineModule extends BaseModule {
  readonly name = "pipeline";

  register(router: Router): void {
    router.get(
      "/pipeline/status",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        sendSuccess(res, {
          enabled: true,
          last_runs: pipelineService.getLastRuns(),
        });
      }),
    );

    router.post(
      "/pipeline/sync",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const data = await pipelineOrchestrator.runAllNow();
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/pipeline/sync/:job",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const job = String(req.params.job);
        const runners: Record<string, () => Promise<Record<string, unknown>>> = {
          news: () => pipelineService.syncNews(),
          commodity: () => pipelineService.syncCommodityPrices(),
          kpi: () => pipelineService.syncKpiRecords(),
          alerts: () => pipelineService.detectAnomalies(),
          agro: () => pipelineService.syncAgroPrices(),
          hazard: () => pipelineService.refreshHazardSignals(),
          weather: () => pipelineService.syncWeatherData(),
          unrest: () => pipelineService.refreshUnrestPulse(),
          outlook: () => pipelineService.refreshStrategicOutlook(),
          signals: () => pipelineService.extractLiveSignals(),
        };
        const fn = runners[job];
        if (!fn) {
          res.status(404).json({ success: false, message: `Unknown job: ${job}` });
          return;
        }
        const detail = await fn();
        sendSuccess(res, { job, detail, completed_at: new Date().toISOString() });
      }),
    );
  }
}

export const pipelineModule = new PipelineModule();
