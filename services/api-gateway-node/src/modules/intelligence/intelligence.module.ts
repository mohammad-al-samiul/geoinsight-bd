import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { intelligenceService } from "./intelligence.service";

const scopeQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

const heatmapQuerySchema = z.object({
  level: z.enum(["district", "upazila"]).optional(),
  limit: z.coerce.number().int().min(10).max(200).optional(),
});

const documentSchema = z.object({
  text: z.string().min(50).max(50000),
  doc_type: z.enum(["tender", "contract"]).optional(),
  contractor_nid: z.string().max(20).optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

const hazardQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
  season: z.string().max(32).optional(),
});

export class IntelligenceModule extends BaseModule {
  readonly name = "intelligence";

  register(router: Router): void {
    router.get(
      "/intelligence/sentiment/heatmap",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(heatmapQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof heatmapQuerySchema>;
        const data = await intelligenceService.getSentimentHeatmap(
          q.level ?? "district",
          q.limit ?? 100,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/predictive/scan",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(scopeQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof scopeQuerySchema>;
        const data = await intelligenceService.scanPredictiveRedFlags(
          q,
          q.lang ?? "bn",
          req.user!.sub,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/accountability/score",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(scopeQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof scopeQuerySchema>;
        const unitId = q.unionId ?? q.upazilaId ?? q.districtId ?? q.divisionId;
        const data = await intelligenceService.scoreAccountability(unitId, q.lang ?? "bn");
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/documents/analyze",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(documentSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await intelligenceService.analyzeDocument(req.body);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/hazards/overlay",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(hazardQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof hazardQuerySchema>;
        const data = await intelligenceService.getHazardOverlay(q, q.season ?? "monsoon");
        sendSuccess(res, data);
      }),
    );
  }
}

export const intelligenceModule = new IntelligenceModule();
