import { Router } from "express";
import { AppModule } from "../core/module/app-module.interface";
import { authModule } from "./auth/auth.module";
import { adminUnitModule } from "./admin-unit/admin-unit.module";
import { kpiModule } from "./kpi/kpi.module";
import { representativeModule } from "./representative/representative.module";
import { projectModule } from "./project/project.module";
import { alertModule } from "./alert/alert.module";
import { agroMarketModule } from "./agro-market/agro-market.module";
import { blockchainModule } from "./blockchain/blockchain.module";
import { dashboardModule } from "./dashboard/dashboard.module";
import { healthModule } from "./health/health.module";

const modules: AppModule[] = [
  healthModule,
  authModule,
  adminUnitModule,
  representativeModule,
  kpiModule,
  projectModule,
  alertModule,
  agroMarketModule,
  blockchainModule,
  dashboardModule,
];

export function registerModules(basePath: Router): void {
  for (const mod of modules) {
    mod.register(basePath);
    console.info(`[modules] Registered: ${mod.name}`);
  }
}
