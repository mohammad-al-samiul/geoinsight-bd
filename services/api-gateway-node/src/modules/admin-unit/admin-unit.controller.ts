import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { AdminUnitService } from "./admin-unit.service";
import { UnitIdParam } from "./admin-unit.validator";

export class AdminUnitController {
  constructor(private readonly service: AdminUnitService) {}

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.getById((req.params as UnitIdParam).unitId));
  });

  getTree = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.getTree((req.params as UnitIdParam).unitId));
  });
}
