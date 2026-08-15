import { Router } from "express";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { loggedPipelineTask } from "../intel/pipeline-run-log.service";
import { pipelineOrchestrator } from "./pipeline.orchestrator";
import { pipelineService } from "./pipeline.service";

export class PipelineModule extends BaseModule {
  readonly name = "pipeline";

  register(router: Router): void {
    router.get(
      "/pipeline/status",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        sendSuccess(res, await pipelineService.getStatus());
      }),
    );

    router.post(
      "/pipeline/sync",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const data = await pipelineOrchestrator.runAllNow();
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/pipeline/sync/:job",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const job = String(req.params.job);
        const fn = pipelineService.jobRunners()[job];
        if (!fn) {
          res.status(404).json({ success: false, message: `Unknown job: ${job}` });
          return;
        }
        const detail = await loggedPipelineTask(job, fn);
        sendSuccess(res, { job, detail, completed_at: new Date().toISOString() });
      }),
    );
  }
}

export const pipelineModule = new PipelineModule();
