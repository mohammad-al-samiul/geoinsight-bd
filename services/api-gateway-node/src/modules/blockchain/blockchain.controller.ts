import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { BlockchainMilestoneService } from "./blockchain.service";
import { SubmitMilestoneDto } from "./blockchain.validator";

export class BlockchainController {
  constructor(private readonly service: BlockchainMilestoneService) {}

  submitMilestone = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.submitMilestone(req.body as SubmitMilestoneDto);
    const statusCode = result.status === "submitted" ? 201 : 202;
    res.status(statusCode).json({ success: true, data: result });
  });

  getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.getQueueStatus(req.params.queueId));
  });

  fabricHealth = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.getFabricHealth());
  });

  retryNow = asyncHandler(async (_req: Request, res: Response) => {
    const processed = await this.service.processPendingQueue();
    sendSuccess(res, { processed });
  });
}
