import { Request, Response } from "express";
import { asyncHandler, sendCreated, sendSuccess } from "../../core/utils/async-handler";
import { KpiService } from "./kpi.service";
import { CreateKpiRecordDto, ListKpiRecordsQuery } from "./kpi.validator";

export class KpiController {
  constructor(private readonly service: KpiService) {}

  listDefinitions = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.service.listDefinitions());
  });

  listRecords = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.listRecords(req.query as unknown as ListKpiRecordsQuery));
  });

  createRecord = asyncHandler(async (req: Request, res: Response) => {
    const dto = req.body as CreateKpiRecordDto;
    sendCreated(res, await this.service.createRecord(dto));
  });
}
