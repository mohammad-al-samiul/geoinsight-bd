import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { simulatorService } from "./simulator.service";

const scenarioSchema = z.object({
  conflict_intensity: z.coerce.number().min(0).max(1),
  sanctions_level: z.coerce.number().min(0).max(1),
  trade_disruption: z.coerce.number().min(0).max(1),
  migration_pressure: z.coerce.number().min(0).max(1),
  oil_price_shock: z.coerce.number().min(0).max(1).optional(),
  region: z.string().max(120).default("Middle East"),
  budget_reallocation_pct: z.coerce.number().min(-20).max(20).optional(),
  agriculture_shock: z.coerce.number().min(0).max(1).optional(),
  energy_shock: z.coerce.number().min(0).max(1).optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

export class SimulatorModule extends BaseModule {
  readonly name = "simulator";

  register(router: Router): void {
    router.post(
      "/simulator/run",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(scenarioSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await simulatorService.runScenario(req.body);
        sendSuccess(res, data);
      }),
    );
  }
}

export const simulatorModule = new SimulatorModule();
