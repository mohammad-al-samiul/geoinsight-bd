import { env } from "../../core/config/env";
import { IntervalWorker } from "../../core/workers/interval-worker";
import { pipelineService } from "./pipeline.service";

export class PipelineOrchestrator {
  private workers: IntervalWorker[] = [];

  start(): void {
    if (this.workers.length > 0) return;

    const stagger = env.PIPELINE_STARTUP_DELAY_MS;

    this.workers = [
      new IntervalWorker(
        "pipeline:news",
        () => pipelineService.syncNews(),
        env.PIPELINE_NEWS_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger,
      ),
      new IntervalWorker(
        "pipeline:commodity",
        () => pipelineService.syncCommodityPrices(),
        env.PIPELINE_COMMODITY_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 15_000,
      ),
      new IntervalWorker(
        "pipeline:kpi",
        () => pipelineService.syncKpiRecords(),
        env.PIPELINE_KPI_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 30_000,
      ),
      new IntervalWorker(
        "pipeline:alerts",
        () => pipelineService.detectAnomalies(),
        env.PIPELINE_ALERT_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 45_000,
      ),
      new IntervalWorker(
        "pipeline:agro",
        () => pipelineService.syncAgroPrices(),
        env.PIPELINE_AGRO_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 60_000,
      ),
      new IntervalWorker(
        "pipeline:hazard",
        () => pipelineService.refreshHazardSignals(),
        env.PIPELINE_HAZARD_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 75_000,
      ),
      new IntervalWorker(
        "pipeline:weather",
        () => pipelineService.syncWeatherData(),
        env.PIPELINE_WEATHER_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 90_000,
      ),
      new IntervalWorker(
        "pipeline:unrest",
        () => pipelineService.refreshUnrestPulse(),
        env.PIPELINE_UNREST_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 105_000,
      ),
      new IntervalWorker(
        "pipeline:signals",
        () => pipelineService.extractLiveSignals(),
        env.PIPELINE_NEWS_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 20_000,
      ),
    ];

    for (const worker of this.workers) {
      worker.start();
    }
    console.info("[pipeline] Orchestrator started with 9 background workers");
  }

  stop(): void {
    for (const worker of this.workers) {
      worker.stop();
    }
    this.workers = [];
  }

  async runAllNow(): Promise<unknown> {
    return pipelineService.runAll();
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
