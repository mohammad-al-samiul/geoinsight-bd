import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { fetchAi } from "../../shared/http/fetch-ai";
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

const phishingScanSchema = z.object({
  url: z.string().url().max(2048),
  similarity_threshold: z.number().min(0.5).max(1).optional(),
  timeout_seconds: z.number().min(2).max(60).optional(),
  official_urls: z.array(z.string().url()).max(200).optional(),
});

const phishingRegisterSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
  timeout_seconds: z.number().min(2).max(60).optional(),
});

const phishingRegisterDefaultsSchema = z.object({
  timeout_seconds: z.number().min(2).max(60).optional(),
});

const proximityCheckSchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        label: z.string().max(120).optional(),
        source: z.string().max(80).optional(),
        recorded_at: z.string().max(64).optional(),
        track_id: z.string().max(64).optional(),
      }),
    )
    .min(1)
    .max(200),
  zone_ids: z.array(z.string().max(64)).max(50).optional(),
});

const faceIntelIdentifySchema = z
  .object({
    image_base64: z.string().min(32).max(8_000_000).optional(),
    nid: z.string().min(5).max(20).optional(),
    threshold: z.number().min(0.4).max(0.99).optional(),
    demo_fallback: z.boolean().optional(),
    lang: z.enum(["bn", "en"]).optional(),
  })
  .refine((b) => Boolean(b.image_base64 || b.nid), {
    message: "image_base64 or nid required",
  });

const faceIntelReportQuerySchema = z.object({
  representativeId: z.string().uuid().optional(),
  nid: z.string().min(5).max(20).optional(),
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

    router.post(
      "/intelligence/phishing/scan",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(phishingScanSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await intelligenceService.scanPhishing(req.body);
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/phishing/register",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(phishingRegisterSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await intelligenceService.registerPhishingOfficials(req.body);
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/phishing/register/defaults",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(phishingRegisterDefaultsSchema, "body"),
      asyncHandler(async (req, res) => {
        const body = req.body as z.infer<typeof phishingRegisterDefaultsSchema>;
        const data = await intelligenceService.registerPhishingDefaults(body.timeout_seconds);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/phishing/official-domains",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        const data = await intelligenceService.listPhishingOfficialDomains();
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/proximity/live",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (req, res) => {
        const include =
          String(req.query.include_demo_vips ?? "true").toLowerCase() !== "false";
        const data = await intelligenceService.getProximityLive(include);
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/proximity/check",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(proximityCheckSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await intelligenceService.checkProximity(req.body);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/proximity/zones",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        const data = await intelligenceService.listProximityZones();
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/intelligence/face-intel/identify",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(faceIntelIdentifySchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await intelligenceService.identifyFaceIntel(req.body);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/face-intel/gallery",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        const data = await intelligenceService.listFaceGallery();
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/intelligence/face-intel/sample/:vipId",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (req, res) => {
        const vipId = String(req.params.vipId ?? "");
        const upstream = await fetchAi(
          `/api/v1/face-intel/sample/${encodeURIComponent(vipId)}`,
        );
        if (!upstream.ok) {
          sendSuccess(res, { error: "sample_not_found" }, 404);
          return;
        }
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "private, max-age=300");
        res.send(buf);
      }),
    );

    router.get(
      "/intelligence/face-intel/ethical-report",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(faceIntelReportQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof faceIntelReportQuerySchema>;
        const data = await intelligenceService.buildEthicalReportCard({
          representativeId: q.representativeId,
          nid: q.nid,
          lang: q.lang ?? "bn",
        });
        if (!data) {
          sendSuccess(res, { error: "representative_not_found" }, 404);
          return;
        }
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
