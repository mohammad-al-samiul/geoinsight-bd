import { Router } from "express";
import { z } from "zod";
import {
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
  LocalOsintSentiment,
  LocalPulseEventKind,
  LocalVisitReason,
  LocalVisitStatus,
  ProjectStatus,
  ServiceOutageKind,
  ServiceOutageStatus,
  UserRole,
} from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { localEntityService } from "./local-entity.service";
import { complaintService } from "./complaint.service";
import { wpiService } from "./wpi.service";
import { localOsintService } from "./osint.service";
import { localPulseService } from "./pulse.service";
import { specialtyService } from "./specialty.service";
import { morningBriefService } from "./morning-brief.service";
import { outageService } from "./outage.service";
import { localBudgetService } from "./budget.service";
import { localCitizenAssistService } from "./citizen-assist.service";
import { localFieldSummaryService } from "./field-summary.service";
import { localHeatmapService } from "./heatmap.service";
import { localVisitService } from "./visit.service";
import { localScorecardService } from "./scorecard.service";
import { localPulseEventService } from "./pulse-event.service";
import { alertDeliveryService } from "../alert-delivery/alert-delivery.service";
import { resolveLocalEntityId } from "./local-entity.scope";

const overviewQuery = z.object({
  entityId: z.string().uuid().optional(),
  scope: z.enum(["entity", "all"]).optional(),
});

const complaintListQuery = z.object({
  entityId: z.string().uuid().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "OVERDUE", "ALL"])
    .optional(),
  redAlertOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createComplaintSchema = z.object({
  entityId: z.string().uuid().optional(),
  wardId: z.string().uuid(),
  title: z.string().min(3).max(255),
  titleBn: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  severity: z.nativeEnum(ComplaintSeverity).optional(),
  citizenName: z.string().max(120).optional(),
  citizenPhone: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  locationLabel: z.string().max(255).optional(),
  beforePhotoUrl: z.string().max(700_000).optional(),
  isRedAlert: z.boolean().optional(),
  assigneeId: z.string().uuid().optional(),
  slaHours: z.number().min(6).max(72).optional(),
});

const triageComplaintSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(4000).optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

const resolveComplaintSchema = z.object({
  afterPhotoUrl: z.string().min(8).max(700_000),
  resolutionNote: z.string().max(2000).optional(),
});

const assignComplaintSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
  note: z.string().max(512).optional(),
});

const noteComplaintSchema = z.object({
  note: z.string().min(2).max(512),
});

const complaintIdParams = z.object({
  complaintId: z.string().uuid(),
});

const wpiQuery = z.object({
  entityId: z.string().uuid().optional(),
  periodKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const wpiHistoryQuery = z.object({
  entityId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
});

const wpiExplainParams = z.object({
  wardId: z.string().uuid(),
});

const osintQuery = z.object({
  entityId: z.string().uuid().optional(),
  propagandaOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(80).optional(),
});

const createOsintSchema = z.object({
  entityId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  title: z.string().min(3).max(512),
  titleBn: z.string().max(512).optional(),
  summary: z.string().max(4000).optional(),
  sourceName: z.string().min(2).max(128),
  sourceUrl: z.string().url().max(2048).optional(),
  matchedKeyword: z.string().min(1).max(120),
  sentiment: z.nativeEnum(LocalOsintSentiment).optional(),
  propagandaFlag: z.boolean().optional(),
  propagandaNote: z.string().max(512).optional(),
});

const pulseQuery = z.object({
  entityId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
});

const specialtyQuery = z.object({
  entityId: z.string().uuid().optional(),
  moduleId: z.string().min(2).max(64).optional(),
});

const alertDeliveryQuery = z.object({
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const alertTestSchema = z.object({
  entityId: z.string().uuid().optional(),
  title: z.string().min(3).max(255).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "ALERT"]).optional(),
});

const LOCAL_ROLES = [UserRole.PMO, UserRole.MP, UserRole.MAYOR] as const;

export class LocalEntityModule extends BaseModule {
  readonly name = "local-entity";

  register(router: Router): void {
    router.get(
      "/local-entity/catalog",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      asyncHandler(async (req, res) => {
        const data = await localEntityService.listCatalog({
          role: req.user!.role,
          adminUnitId: req.user!.adminUnitId,
        });
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/overview",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await localEntityService.getOverview(
          {
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          entityId,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/morning-brief",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId, scope } = req.query as {
          entityId?: string;
          scope?: "entity" | "all";
        };
        const user = { role: req.user!.role, adminUnitId: req.user!.adminUnitId };
        const data =
          scope === "all" && req.user!.role === UserRole.PMO
            ? await morningBriefService.getPmoMultiBrief(user)
            : await morningBriefService.getBrief(user, entityId);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/morning-brief/export",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const csv = await morningBriefService.exportCsv(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          entityId,
        );
        const day = new Date().toISOString().slice(0, 10);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="local-morning-brief-${day}.csv"`,
        );
        res.status(200).send(csv);
      }),
    );

    router.post(
      "/local-entity/morning-brief/digest",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await morningBriefService.sendDigest(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          entityId,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/complaints",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintListQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as {
          entityId?: string;
          status?: ComplaintStatus | "OVERDUE" | "ALL";
          redAlertOnly?: boolean;
          limit?: number;
        };
        const data = await complaintService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/complaints",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(createComplaintSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await complaintService.create(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.body,
        );
        sendSuccess(res, data, 201);
      }),
    );

    router.post(
      "/local-entity/complaints/triage",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(triageComplaintSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await complaintService.triageSuggest(req.body);
        sendSuccess(res, data);
      }),
    );

    router.patch(
      "/local-entity/complaints/:complaintId/start",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintIdParams, "params"),
      asyncHandler(async (req, res) => {
        const data = await complaintService.startProgress(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.params.complaintId!,
        );
        sendSuccess(res, data);
      }),
    );

    router.patch(
      "/local-entity/complaints/:complaintId/assign",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintIdParams, "params"),
      validate(assignComplaintSchema, "body"),
      asyncHandler(async (req, res) => {
        const body = req.body as { assigneeId: string | null; note?: string };
        const data = await complaintService.assign(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.params.complaintId!,
          body.assigneeId,
          body.note,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/complaints/:complaintId/notes",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintIdParams, "params"),
      validate(noteComplaintSchema, "body"),
      asyncHandler(async (req, res) => {
        const body = req.body as { note: string };
        const data = await complaintService.addNote(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.params.complaintId!,
          body.note,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/complaints/:complaintId/timeline",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintIdParams, "params"),
      asyncHandler(async (req, res) => {
        const data = await complaintService.timeline(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.complaintId!,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/complaint-assignees",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await complaintService.listAssignees(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          entityId,
        );
        sendSuccess(res, data);
      }),
    );

    router.patch(
      "/local-entity/complaints/:complaintId/resolve",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(complaintIdParams, "params"),
      validate(resolveComplaintSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await complaintService.resolve(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.params.complaintId!,
          req.body,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/wpi",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(wpiQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; periodKey?: string };
        const data = await wpiService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/wpi/history",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(wpiHistoryQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; wardId?: string };
        const data = await wpiService.history(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/wpi/wards/:wardId/explain",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(wpiExplainParams, "params"),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await wpiService.explainWard(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.wardId!,
          entityId,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/wpi/recompute",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(wpiQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; periodKey?: string };
        const data = await wpiService.recompute(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/osint",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(osintQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as {
          entityId?: string;
          propagandaOnly?: boolean;
          limit?: number;
        };
        const data = await localOsintService.feed(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/osint",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(createOsintSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await localOsintService.createCurated(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.body,
        );
        sendSuccess(res, data, 201);
      }),
    );

    router.get(
      "/local-entity/pulse",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(pulseQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; wardId?: string };
        const data = await localPulseService.getPulse(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/specialty",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(specialtyQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; moduleId?: string };
        const data = await specialtyService.getPack(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/specialty/scan-anomalies",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(specialtyQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string };
        const data = await specialtyService.scanAnomalies(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          { entityId: q.entityId, notify: true },
        );
        sendSuccess(res, data);
      }),
    );

    const citizenAssistSchema = z.object({
      entityId: z.string().uuid().optional(),
      message: z.string().min(1).max(2000),
      lang: z.enum(["bn", "en"]).optional(),
    });

    router.post(
      "/local-entity/citizen-assist",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(citizenAssistSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await localCitizenAssistService.chat(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.body,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/alert-deliveries",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(alertDeliveryQuery, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; limit?: number };
        const data = await alertDeliveryService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/alert-deliveries/test",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(alertTestSchema, "body"),
      asyncHandler(async (req, res) => {
        const body = req.body as {
          entityId?: string;
          title?: string;
          severity?: string;
        };
        const entityId = await resolveLocalEntityId(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          body.entityId,
        );
        const data = await alertDeliveryService.notifyCrisis({
          entityId,
          sourceKind: "manual",
          title: body.title?.trim() || "Manual DSS crisis test",
          detail: "Triggered from Local Entity DSS alert delivery panel",
          severity: body.severity ?? "CRITICAL",
          forceVoice: true,
        });
        sendSuccess(res, data, 201);
      }),
    );

    router.post(
      "/local-entity/alert-deliveries/:deliveryId/retry",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(z.object({ deliveryId: z.string().uuid() }), "params"),
      asyncHandler(async (req, res) => {
        const data = await alertDeliveryService.retryOne(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.deliveryId!,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/outages",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          status: z.enum(["ACTIVE", "WATCH", "RESOLVED", "ALL"]).optional(),
          kind: z.nativeEnum(ServiceOutageKind).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
        }),
        "query",
      ),
      asyncHandler(async (req, res) => {
        const q = req.query as {
          entityId?: string;
          status?: ServiceOutageStatus | "ALL";
          kind?: ServiceOutageKind;
          limit?: number;
        };
        const data = await outageService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/outages",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          wardId: z.string().uuid().optional(),
          kind: z.nativeEnum(ServiceOutageKind).optional(),
          title: z.string().min(3).max(255),
          titleBn: z.string().max(255).optional(),
          detail: z.string().max(4000).optional(),
          detailBn: z.string().max(4000).optional(),
          severity: z.number().int().min(1).max(5).optional(),
          affectedCount: z.number().int().min(0).max(1_000_000).optional(),
          lat: z.number().optional(),
          lng: z.number().optional(),
          etaRestoreAt: z.string().datetime().optional(),
        }),
        "body",
      ),
      asyncHandler(async (req, res) => {
        const data = await outageService.create(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.body,
        );
        sendSuccess(res, data, 201);
      }),
    );

    router.patch(
      "/local-entity/outages/:outageId/resolve",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(z.object({ outageId: z.string().uuid() }), "params"),
      asyncHandler(async (req, res) => {
        const data = await outageService.resolve(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.outageId!,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/budget",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          status: z.nativeEnum(ProjectStatus).optional(),
        }),
        "query",
      ),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; status?: ProjectStatus };
        const data = await localBudgetService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/field-summary",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await localFieldSummaryService.getSummary(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          { entityId },
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/heatmap",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(overviewQuery, "query"),
      asyncHandler(async (req, res) => {
        const { entityId } = req.query as { entityId?: string };
        const data = await localHeatmapService.getBoard(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          { entityId },
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/scorecard",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          compare: z.enum(["wards", "entities"]).optional(),
        }),
        "query",
      ),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; compare?: "wards" | "entities" };
        const data = await localScorecardService.getScorecard(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/visits",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          status: z.enum(["PLANNED", "DONE", "CANCELLED", "ALL"]).optional(),
        }),
        "query",
      ),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; status?: LocalVisitStatus | "ALL" };
        const data = await localVisitService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/visits",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          wardId: z.string().uuid().optional(),
          title: z.string().min(3).max(255),
          titleBn: z.string().max(255).optional(),
          reason: z.nativeEnum(LocalVisitReason).optional(),
          scheduledAt: z.string().datetime().optional(),
          notes: z.string().max(4000).optional(),
          priority: z.number().int().min(1).max(100).optional(),
        }),
        "body",
      ),
      asyncHandler(async (req, res) => {
        const data = await localVisitService.create(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.body,
        );
        sendSuccess(res, data, 201);
      }),
    );

    router.patch(
      "/local-entity/visits/:visitId/status",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(z.object({ visitId: z.string().uuid() }), "params"),
      validate(z.object({ status: z.nativeEnum(LocalVisitStatus) }), "body"),
      asyncHandler(async (req, res) => {
        const data = await localVisitService.updateStatus(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.visitId!,
          (req.body as { status: LocalVisitStatus }).status,
        );
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/local-entity/pulse-events",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          days: z.coerce.number().int().min(7).max(90).optional(),
        }),
        "query",
      ),
      asyncHandler(async (req, res) => {
        const q = req.query as { entityId?: string; days?: number };
        const data = await localPulseEventService.list(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          q,
        );
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/local-entity/pulse-events",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(
        z.object({
          entityId: z.string().uuid().optional(),
          wardId: z.string().uuid().optional(),
          influencerId: z.string().uuid().optional(),
          kind: z.nativeEnum(LocalPulseEventKind).optional(),
          title: z.string().min(3).max(255),
          titleBn: z.string().max(255).optional(),
          detail: z.string().max(4000).optional(),
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime().optional(),
          locationLabel: z.string().max(255).optional(),
        }),
        "body",
      ),
      asyncHandler(async (req, res) => {
        const data = await localPulseEventService.create(
          {
            id: req.user!.sub,
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          },
          req.body,
        );
        sendSuccess(res, data, 201);
      }),
    );

    router.patch(
      "/local-entity/pulse-events/:eventId/done",
      authenticate(),
      container.rbac.requireRoles(...LOCAL_ROLES),
      validate(z.object({ eventId: z.string().uuid() }), "params"),
      validate(z.object({ done: z.boolean().optional() }), "body"),
      asyncHandler(async (req, res) => {
        const data = await localPulseEventService.markDone(
          { role: req.user!.role, adminUnitId: req.user!.adminUnitId },
          req.params.eventId!,
          (req.body as { done?: boolean }).done ?? true,
        );
        sendSuccess(res, data);
      }),
    );
  }
}

export const localEntityModule = new LocalEntityModule();
