import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { deskService } from "./desk.service";

export class DeskModule extends BaseModule {
  readonly name = "desk";

  register(router: Router): void {
    router.get(
      "/desk/nav-pulse",
      authenticate(),
      asyncHandler(async (req, res) => {
        sendSuccess(
          res,
          await deskService.getNavPulse({
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          }),
        );
      }),
    );
  }
}

export const deskModule = new DeskModule();
