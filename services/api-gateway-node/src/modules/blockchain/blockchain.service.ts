import { prisma } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { IFabricGatewayClient } from "../../infrastructure/blockchain/fabric.client";
import {
  buildMilestonePayload,
  hashMilestonePayload,
} from "../../infrastructure/blockchain/payload-hasher";
import { BlockchainQueueRepository } from "../../infrastructure/blockchain/queue.repository";
import { SubmitMilestoneDto } from "./blockchain.validator";
import {
  recordBlockchainBlock,
  refreshBlockchainQueueGauges,
} from "../../core/metrics/metrics";

export type MilestoneSubmitStatus = "submitted" | "queued" | "duplicate";

export interface MilestoneSubmitResponse {
  status: MilestoneSubmitStatus;
  payloadHash: string;
  fabricTxId?: string;
  queueId?: string;
  message: string;
}

export class BlockchainMilestoneService {
  constructor(
    private readonly fabricClient: IFabricGatewayClient,
    private readonly queueRepo: BlockchainQueueRepository,
    private readonly chaincodeName: string,
    private readonly defaultMaxRetries: number,
  ) {}

  async submitMilestone(dto: SubmitMilestoneDto): Promise<MilestoneSubmitResponse> {
    await this.assertReferencesExist(dto.projectId, dto.representativeId);

    const payload = buildMilestonePayload(dto);
    const payloadHash = hashMilestonePayload(payload);

    const existing = await this.queueRepo.findByHash(payloadHash);
    if (existing?.status === "SUBMITTED") {
      return {
        status: "duplicate",
        payloadHash,
        fabricTxId: existing.fabricTxId ?? undefined,
        queueId: existing.id,
        message: "Milestone already recorded on ledger (hash match)",
      };
    }

    try {
      const { transactionId } = await this.fabricClient.submitProjectMilestone(
        payload,
        payloadHash,
      );

      await this.persistSuccess(dto.projectId, payloadHash, transactionId, existing?.id);
      recordBlockchainBlock("direct");

      return {
        status: "submitted",
        payloadHash,
        fabricTxId: transactionId,
        message: "Milestone anchored on Hyperledger Fabric",
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const queued = await this.enqueueFallback(payload, payloadHash, reason);

      return {
        status: "queued",
        payloadHash,
        queueId: queued.id,
        message: `Fabric unreachable — queued for automatic retry (${reason})`,
      };
    }
  }

  async processPendingQueue(batchSize = 20): Promise<number> {
    const batch = await this.queueRepo.claimPendingBatch(batchSize);
    let processed = 0;

    for (const record of batch) {
      const payload = this.queueRepo.toPayload(record);
      try {
        const { transactionId } = await this.fabricClient.submitProjectMilestone(
          payload,
          record.payloadHash,
        );
        await this.queueRepo.markSubmitted(record.id, transactionId);
        await prisma.project.update({
          where: { id: record.projectId },
          data: { blockchainTx: transactionId },
        });
        recordBlockchainBlock("retry_worker");
        processed += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await this.queueRepo.markRetry(
          record.id,
          record.retryCount + 1,
          record.maxRetries,
          reason,
        );
      }
    }

    await refreshBlockchainQueueGauges().catch(() => undefined);
    return processed;
  }

  async getQueueStatus(queueId: string) {
    const record = await prisma.blockchainMilestoneQueue.findUnique({
      where: { id: queueId },
    });
    if (!record) throw ApiError.notFound("Queue record not found");
    return record;
  }

  async getFabricHealth() {
    const reachable = await this.fabricClient.ping();
    return { fabricReachable: reachable };
  }

  private async persistSuccess(
    projectId: string,
    payloadHash: string,
    fabricTxId: string,
    existingQueueId?: string,
  ) {
    await prisma.project.update({
      where: { id: projectId },
      data: { blockchainTx: fabricTxId },
    });

    if (existingQueueId) {
      await this.queueRepo.markSubmitted(existingQueueId, fabricTxId);
      return;
    }

    const existing = await this.queueRepo.findByHash(payloadHash);
    if (!existing) return;

    await this.queueRepo.markSubmitted(existing.id, fabricTxId);
  }

  private async enqueueFallback(
    payload: ReturnType<typeof buildMilestonePayload>,
    payloadHash: string,
    reason: string,
  ) {
    const existing = await this.queueRepo.findByHash(payloadHash);
    if (existing) {
      return this.queueRepo.markRetry(
        existing.id,
        existing.retryCount,
        existing.maxRetries,
        reason,
      );
    }

    return this.queueRepo.enqueue({
      payload,
      payloadHash,
      chaincodeName: this.chaincodeName,
      maxRetries: this.defaultMaxRetries,
      lastError: reason,
    });
  }

  private async assertReferencesExist(projectId: string, representativeId: string) {
    const [project, representative] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.representative.findUnique({ where: { id: representativeId } }),
    ]);

    if (!project) throw ApiError.notFound("Project not found");
    if (!representative) throw ApiError.notFound("Representative not found");
  }
}
