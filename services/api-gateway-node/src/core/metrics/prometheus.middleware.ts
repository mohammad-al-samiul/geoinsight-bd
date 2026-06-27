import promBundle from "express-prom-bundle";
import { Request } from "express";
import { register } from "./metrics";

/** HTTP + process metrics at `GET /metrics` (skipped in test). */
export const prometheusMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  autoregister: false,
  promRegistry: register,
  metricsPath: "/metrics",
  bypass: (req: Request) => req.path === "/metrics",
});
