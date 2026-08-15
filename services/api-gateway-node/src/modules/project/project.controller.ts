import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { container } from "../../core/di/container";
import { ApiError } from "../../core/errors/api.error";
import { ProjectService } from "./project.service";
import { ListProjectsQuery } from "./project.validator";

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.service.listByUnit(req.query as unknown as ListProjectsQuery));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getById(req.params.projectId);
    const user = req.user;
    if (user && user.role !== UserRole.PMO && user.adminUnitId) {
      const allowed = await container.adminScopeService.isWithinScope(
        user.adminUnitId,
        user.role,
        data.adminUnitId,
      );
      if (!allowed) {
        throw ApiError.forbidden("Target unit is outside your administrative scope");
      }
    }
    sendSuccess(res, data);
  });
}
