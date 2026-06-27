import { Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { ProjectService } from "./project.service";
import { ListProjectsQuery } from "./project.validator";

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.listByUnit(req.query as unknown as ListProjectsQuery));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.getById(req.params.projectId));
  });
}
