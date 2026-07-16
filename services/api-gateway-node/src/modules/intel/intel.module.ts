import { Router } from "express";
import { UserRole, IntelSnapshotKind } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import {
  getIntelStorageStats,
  listIntelSnapshotHistory,
} from "./intel-snapshot.service";
import {
  getRecentIngestionRuns,
  getRecentPipelineRuns,
} from "./pipeline-run-log.service";

const KINDS = new Set<string>(["BRIEFING", "OUTLOOK", "UNREST"]);

function parseKind(raw: string | undefined): IntelSnapshotKind | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return KINDS.has(upper) ? (upper as IntelSnapshotKind) : null;
}

export class IntelModule extends BaseModule {
  readonly name = "intel";

  register(router: Router): void {
    router.get(
      "/intel/stats",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        sendSuccess(res, await getIntelStorageStats());
      }),
    );

    router.get(
      "/intel/snapshots/history",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const kind = parseKind(String(req.query.kind ?? "BRIEFING"));
        if (!kind) {
          res.status(400).json({ success: false, message: "Invalid kind" });
          return;
        }
        const lang = String(req.query.lang ?? "bn").slice(0, 8);
        const scopeKey =
          typeof req.query.scope === "string" && req.query.scope.length
            ? req.query.scope
            : null;
        const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
        sendSuccess(res, {
          kind,
          lang,
          scope_key: scopeKey,
          items: await listIntelSnapshotHistory(kind, lang, scopeKey, limit),
        });
      }),
    );

    router.get(
      "/intel/pipeline/runs",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const job =
          typeof req.query.job === "string" && req.query.job.length
            ? req.query.job
            : undefined;
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
        sendSuccess(res, await getRecentPipelineRuns(job, limit));
      }),
    );

    router.get(
      "/intel/ingestion/runs",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
        sendSuccess(res, await getRecentIngestionRuns(limit));
      }),
    );
  }
}

export const intelModule = new IntelModule();
