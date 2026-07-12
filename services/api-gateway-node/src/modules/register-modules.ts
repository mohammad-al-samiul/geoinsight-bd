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
import { briefingModule } from "./briefing/briefing.module";
import { intelligenceModule } from "./intelligence/intelligence.module";
import { simulatorModule } from "./simulator/simulator.module";
import { procurementModule } from "./procurement/procurement.module";
import { sovereignModule } from "./sovereign/sovereign.module";
import { twinModule } from "./twin/twin.module";
import { auditTrailModule } from "./audit-trail/audit-trail.module";
import { citizenModule } from "./citizen/citizen.module";
import { searchModule } from "./search/search.module";
import { healthModule } from "./health/health.module";
import { publicFeedModule } from "./public-feed/public-feed.module";
import { ingestionModule } from "./ingestion/ingestion.module";
import { pipelineModule } from "./pipeline/pipeline.module";
import { weatherModule } from "./weather/weather.module";
import { unrestModule } from "./unrest/unrest.module";
import { outlookModule } from "./outlook/outlook.module";

const modules: AppModule[] = [
  healthModule,
  publicFeedModule,
  authModule,
  adminUnitModule,
  representativeModule,
  kpiModule,
  projectModule,
  alertModule,
  agroMarketModule,
  blockchainModule,
  dashboardModule,
  briefingModule,
  intelligenceModule,
  ingestionModule,
  pipelineModule,
  weatherModule,
  unrestModule,
  outlookModule,
  simulatorModule,
  procurementModule,
  sovereignModule,
  twinModule,
  auditTrailModule,
  citizenModule,
  searchModule,
];

export function registerModules(basePath: Router): void {
  for (const mod of modules) {
    mod.register(basePath);
    console.info(`[modules] Registered: ${mod.name}`);
  }
}
