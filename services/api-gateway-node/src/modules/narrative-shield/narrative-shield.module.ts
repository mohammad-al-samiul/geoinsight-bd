import { Router } from "express";
import { z } from "zod";
import { NarrativeCategory, NarrativeSignalStatus, NarrativeThreatLevel, UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { narrativeShieldService } from "./narrative-shield.service";

// ── Query / body schemas ───────────────────────────────────────────────────────
const feedQuerySchema = z.object({
  status: z.nativeEnum(NarrativeSignalStatus).optional(),
  threatLevel: z.nativeEnum(NarrativeThreatLevel).optional(),
  category: z.nativeEnum(NarrativeCategory).optional(),
  organization: z.string().max(255).optional(),
  search: z.string().max(200).optional(),
  division: z.string().max(64).optional(),
  district: z.string().max(64).optional(),
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const refreshBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const debunkBodySchema = z.object({
  signalId: z.string().uuid(),
  lang: z.enum(["bn", "en"]).optional(),
});

const escalateBodySchema = z.object({
  signalId: z.string().uuid(),
});

const dismissBodySchema = z.object({
  signalId: z.string().uuid(),
});

const bulkActionBodySchema = z.object({
  signalIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["DEBUNK", "ESCALATE", "DISMISS"]),
  lang: z.enum(["bn", "en"]).optional(),
});

// ── Module ────────────────────────────────────────────────────────────────────
export class NarrativeShieldModule extends BaseModule {
  readonly name = "narrative-shield";

  register(router: Router): void {
    // GET /narrative-shield/feed — list signals with filters
    router.get(
      "/narrative-shield/feed",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(feedQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof feedQuerySchema>;
        const data = await narrativeShieldService.getFeed(q);
        sendSuccess(res, data);
      }),
    );

    // GET /narrative-shield/stats — quick summary stats
    router.get(
      "/narrative-shield/stats",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        const data = await narrativeShieldService.getStats();
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/refresh — pull new signals from AI service + upsert DB
    router.post(
      "/narrative-shield/refresh",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(refreshBodySchema, "body"),
      asyncHandler(async (req, res) => {
        const { limit } = req.body as z.infer<typeof refreshBodySchema>;
        const data = await narrativeShieldService.refresh(limit ?? 20);
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/debunk — RAG debunk a single signal
    router.post(
      "/narrative-shield/debunk",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(debunkBodySchema, "body"),
      asyncHandler(async (req, res) => {
        const { signalId, lang } = req.body as z.infer<typeof debunkBodySchema>;
        const user = req.user as { id?: string; role?: string } | undefined;
        const ip = req.ip ?? req.socket.remoteAddress;
        const data = await narrativeShieldService.debunk(
          signalId, lang ?? "bn", user?.id, ip, user?.role,
        );
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/escalate — mark signal as PMO-escalated
    router.post(
      "/narrative-shield/escalate",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(escalateBodySchema, "body"),
      asyncHandler(async (req, res) => {
        const { signalId } = req.body as z.infer<typeof escalateBodySchema>;
        const user = req.user as { id?: string; role?: string } | undefined;
        const ip = req.ip ?? req.socket.remoteAddress;
        const data = await narrativeShieldService.escalate(signalId, user?.id, ip, user?.role);
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/dismiss — mark signal as dismissed
    router.post(
      "/narrative-shield/dismiss",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(dismissBodySchema, "body"),
      asyncHandler(async (req, res) => {
        const { signalId } = req.body as z.infer<typeof dismissBodySchema>;
        const user = req.user as { id?: string; role?: string } | undefined;
        const ip = req.ip ?? req.socket.remoteAddress;
        const data = await narrativeShieldService.dismiss(signalId, user?.id, ip, user?.role);
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/bulk — bulk DEBUNK / ESCALATE / DISMISS
    router.post(
      "/narrative-shield/bulk",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(bulkActionBodySchema, "body"),
      asyncHandler(async (req, res) => {
        const { signalIds, action, lang } = req.body as z.infer<typeof bulkActionBodySchema>;
        const user = req.user as { id?: string; role?: string } | undefined;
        const ip = req.ip ?? req.socket.remoteAddress;
        const data = await narrativeShieldService.bulkAction(
          signalIds, action, lang ?? "bn", user?.id, ip, user?.role,
        );
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/dedup — remove duplicate fingerprints from DB
    router.post(
      "/narrative-shield/dedup",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const data = await narrativeShieldService.dedupDb();
        sendSuccess(res, data);
      }),
    );

    // POST /narrative-shield/reset — full DB wipe (PMO only)
    router.post(
      "/narrative-shield/reset",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO),
      asyncHandler(async (_req, res) => {
        const data = await narrativeShieldService.resetDb();
        sendSuccess(res, data);
      }),
    );

    // GET /narrative-shield/export — CSV download
    router.get(
      "/narrative-shield/export",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const csv = await narrativeShieldService.exportCsv();
        const filename = `narrative-shield-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send("\uFEFF" + csv); // UTF-8 BOM for Excel Bengali rendering
      }),
    );
  }
}

export const narrativeShieldModule = new NarrativeShieldModule();
