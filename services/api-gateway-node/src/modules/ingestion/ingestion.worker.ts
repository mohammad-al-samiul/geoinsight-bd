import { IntervalWorker } from "../../core/workers/interval-worker";

/** @deprecated Use IntervalWorker directly — kept for backward compatibility. */
export class IngestionBackgroundWorker extends IntervalWorker {
  constructor(
    syncFn: () => Promise<unknown>,
    intervalMs: number,
    runOnStart: boolean,
    startupDelayMs = 45_000,
  ) {
    super("ingestion-worker", syncFn, intervalMs, runOnStart, startupDelayMs);
  }
}

export { IntervalWorker };
