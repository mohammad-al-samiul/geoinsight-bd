/** Generic interval background worker — single-flight, startup delay, graceful stop. */
export class IntervalWorker {
  private timer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly name: string,
    private readonly task: () => Promise<unknown>,
    private readonly intervalMs: number,
    private readonly runOnStart: boolean,
    private readonly startupDelayMs = 45_000,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    console.info(`[${this.name}] Started (interval ${this.intervalMs}ms)`);
    if (this.runOnStart) {
      this.startupTimer = setTimeout(() => {
        void this.tick();
      }, this.startupDelayMs);
      console.info(`[${this.name}] First run in ${this.startupDelayMs}ms`);
    }
  }

  stop(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runNow(): Promise<unknown> {
    return this.tick();
  }

  private async tick(): Promise<unknown> {
    if (this.running) return undefined;
    this.running = true;
    try {
      const result = await this.task();
      console.info(`[${this.name}] Complete:`, result);
      return result;
    } catch (err) {
      console.error(`[${this.name}] Error:`, err);
      // Background jobs must never crash the gateway process.
      // They will retry on the next interval / manual sync.
      return { error: err instanceof Error ? err.message : String(err) };
    } finally {
      this.running = false;
    }
  }
}
