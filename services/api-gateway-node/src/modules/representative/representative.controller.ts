import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { RepresentativeService } from "./representative.service";
import { ListRepresentativesQuery } from "./representative.validator";

export class RepresentativeController {
  constructor(private readonly service: RepresentativeService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const { unitId } = req.query as unknown as ListRepresentativesQuery;
    sendSuccess(res, await this.service.listByUnit(unitId));
  });
}
