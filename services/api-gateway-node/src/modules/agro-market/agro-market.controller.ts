import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { AgroMarketService } from "./agro-market.service";
import { ListAgroMarketsQuery } from "./agro-market.validator";

export class AgroMarketController {
  constructor(private readonly service: AgroMarketService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const { unitId } = req.query as unknown as ListAgroMarketsQuery;
    sendSuccess(res, await this.service.listByUnit(unitId));
  });
}
