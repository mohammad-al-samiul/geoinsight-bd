import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { AlertService } from "./alert.service";
import { ListAlertsQuery } from "./alert.validator";

export class AlertController {
  constructor(private readonly service: AlertService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.list(req.query as unknown as ListAlertsQuery));
  });

  resolve = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await this.service.resolve(req.params.alertId, req.user!.sub, req.ip),
    );
  });
}
