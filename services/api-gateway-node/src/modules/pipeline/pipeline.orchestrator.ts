import { env } from "../../core/config/env";
import { IntervalWorker } from "../../core/workers/interval-worker";
import { pipelineService } from "./pipeline.service";
import { loggedPipelineTask } from "../intel/pipeline-run-log.service";

const DAY_MS = 86_400_000;

export class PipelineOrchestrator {
  private workers: IntervalWorker[] = [];

  start(): void {
    if (this.workers.length > 0) return;

    const stagger = env.PIPELINE_STARTUP_DELAY_MS;
    const log = (job: string, fn: () => Promise<Record<string, unknown>>) =>
      () => loggedPipelineTask(job, fn);

    this.workers = [
      new IntervalWorker(
        "pipeline:news",
        log("news", () => pipelineService.syncNews()),
        env.PIPELINE_NEWS_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger,
      ),
      new IntervalWorker(
        "pipeline:commodity",
        log("commodity", () => pipelineService.syncCommodityPrices()),
        env.PIPELINE_COMMODITY_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 15_000,
      ),
      new IntervalWorker(
        "pipeline:kpi",
        log("kpi", () => pipelineService.syncKpiRecords()),
        env.PIPELINE_KPI_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 30_000,
      ),
      new IntervalWorker(
        "pipeline:alerts",
        log("alerts", () => pipelineService.detectAnomalies()),
        env.PIPELINE_ALERT_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 45_000,
      ),
      new IntervalWorker(
        "pipeline:agro",
        log("agro", () => pipelineService.syncAgroPrices()),
        env.PIPELINE_AGRO_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 60_000,
      ),
      new IntervalWorker(
        "pipeline:hazard",
        log("hazard", () => pipelineService.refreshHazardSignals()),
        env.PIPELINE_HAZARD_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 75_000,
      ),
      new IntervalWorker(
        "pipeline:weather",
        log("weather", () => pipelineService.syncWeatherData()),
        env.PIPELINE_WEATHER_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 90_000,
      ),
      new IntervalWorker(
        "pipeline:unrest",
        log("unrest", () => pipelineService.refreshUnrestPulse()),
        env.PIPELINE_UNREST_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 105_000,
      ),
      new IntervalWorker(
        "pipeline:signals",
        log("signals", () => pipelineService.extractLiveSignals()),
        env.PIPELINE_NEWS_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 20_000,
      ),
      new IntervalWorker(
        "pipeline:outlook",
        log("outlook", () => pipelineService.refreshStrategicOutlook()),
        env.PIPELINE_OUTLOOK_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 120_000,
      ),
      new IntervalWorker(
        "pipeline:briefing",
        log("briefing", () => pipelineService.refreshMorningBriefing()),
        env.PIPELINE_BRIEFING_INTERVAL_MS,
        env.PIPELINE_RUN_ON_START,
        stagger + 135_000,
      ),
      new IntervalWorker(
        "pipeline:maintenance",
        async () => {
          const { pruneIntelSnapshots } = await import("../intel/intel-snapshot.service");
          const { pruneAuditLogs } = await import("../intel/pipeline-run-log.service");
          const intel = await pruneIntelSnapshots();
          const audit = await pruneAuditLogs();
          return { intel, audit };
        },
        DAY_MS,
        true,
        stagger + 150_000,
      ),
    ];

    for (const worker of this.workers) {
      worker.start();
    }
    console.info(`[pipeline] Orchestrator started with ${this.workers.length} background workers`);
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
