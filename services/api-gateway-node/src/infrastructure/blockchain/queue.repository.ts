import { BlockchainTxStatus, Prisma } from "@prisma/client";
import { prisma } from "../../core/database/prisma.client";
import { MilestonePayload } from "./payload-hasher";

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 300_000;

export interface QueueRecordInput {
  payload: MilestonePayload;
  payloadHash: string;
  chaincodeName: string;
  maxRetries?: number;
  lastError?: string;
}

export class BlockchainQueueRepository {
  async enqueue(input: QueueRecordInput) {
    return prisma.blockchainMilestoneQueue.create({
      data: {
        projectId: input.payload.projectId,
        representativeId: input.payload.representativeId,
        allocatedBudget: new Prisma.Decimal(input.payload.allocatedBudget),
        spendingVariance: new Prisma.Decimal(input.payload.spendingVariance),
        progressPercentage: new Prisma.Decimal(input.payload.progressPercentage),
        payloadHash: input.payloadHash,
        chaincodeName: input.chaincodeName,
        maxRetries: input.maxRetries ?? 5,
        lastError: input.lastError,
        status: BlockchainTxStatus.PENDING,
        nextRetryAt: new Date(),
      },
    });
  }

  async findByHash(payloadHash: string) {
    return prisma.blockchainMilestoneQueue.findUnique({ where: { payloadHash } });
  }

  async claimPendingBatch(limit: number) {
    const now = new Date();
    return prisma.blockchainMilestoneQueue.findMany({
      where: {
        status: BlockchainTxStatus.PENDING,
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: "asc" },
      take: limit,
    });
  }

  async markSubmitted(id: string, fabricTxId: string) {
    return prisma.blockchainMilestoneQueue.update({
      where: { id },
      data: {
        status: BlockchainTxStatus.SUBMITTED,
        fabricTxId,
        lastError: null,
      },
    });
  }

  async markRetry(id: string, retryCount: number, maxRetries: number, error: string) {
    const nextRetryAt = new Date(
      Date.now() + Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** retryCount),
    );

    const status =
      retryCount >= maxRetries ? BlockchainTxStatus.DEAD_LETTER : BlockchainTxStatus.PENDING;

    return prisma.blockchainMilestoneQueue.update({
      where: { id },
      data: {
        retryCount,
        lastError: error.slice(0, 2000),
        nextRetryAt,
        status,
      },
    });
  }

  toPayload(record: {
    projectId: string;
    representativeId: string;
    allocatedBudget: Prisma.Decimal;
    spendingVariance: Prisma.Decimal;
    progressPercentage: Prisma.Decimal;
  }): MilestonePayload {
    return {
      projectId: record.projectId,
      representativeId: record.representativeId,
      allocatedBudget: record.allocatedBudget.toString(),
      spendingVariance: record.spendingVariance.toString(),
      progressPercentage: record.progressPercentage.toString(),
    };
  }
}
