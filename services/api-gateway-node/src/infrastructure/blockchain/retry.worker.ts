import { BlockchainMilestoneService } from "../../modules/blockchain/blockchain.service";

export class BlockchainRetryWorker {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly service: BlockchainMilestoneService,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.service.processPendingQueue().catch((err) => {
        console.error("[blockchain-retry] Worker error:", err);
      });
    }, this.intervalMs);
    console.info(`[blockchain-retry] Started (interval ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
