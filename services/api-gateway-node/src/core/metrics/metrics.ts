import client from "prom-client";
import { prisma } from "../database/prisma.client";

export const register = new client.Registry();

client.collectDefaultMetrics({ register, prefix: "geoinsight_" });

export const blockchainBlocksTotal = new client.Counter({
  name: "geoinsight_blockchain_blocks_total",
  help: "Total Hyperledger milestone blocks anchored on Fabric",
  labelNames: ["source"],
  registers: [register],
});

export const blockchainBlockIntervalSeconds = new client.Histogram({
  name: "geoinsight_blockchain_block_interval_seconds",
  help: "Seconds between consecutive blockchain milestone submissions",
  buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
});

export const blockchainQueueDepth = new client.Gauge({
  name: "geoinsight_blockchain_queue_depth",
  help: "Blockchain milestone retry queue depth by status",
  labelNames: ["status"],
  registers: [register],
});

let lastBlockUnixSeconds = 0;

export function recordBlockchainBlock(source: "direct" | "retry_worker"): void {
  const now = Date.now() / 1000;
  if (lastBlockUnixSeconds > 0) {
    blockchainBlockIntervalSeconds.observe(now - lastBlockUnixSeconds);
  }
  lastBlockUnixSeconds = now;
  blockchainBlocksTotal.inc({ source });
}

export async function refreshBlockchainQueueGauges(): Promise<void> {
  const rows = await prisma.blockchainMilestoneQueue.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  blockchainQueueDepth.reset();
  for (const row of rows) {
    blockchainQueueDepth.set(
      { status: row.status.toLowerCase() },
      row._count._all,
    );
  }
}
