import {
  ComplaintCategory,
  ComplaintEventKind,
  ComplaintSeverity,
  ComplaintStatus,
  Prisma,
  SignalSource,
  UserRole,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { publishToGovQueue } from "../../infrastructure/messaging/gov-queue.publisher";
import { alertDeliveryService } from "../alert-delivery/alert-delivery.service";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import {
  getMinioObject,
  isMinioConfigured,
  isMinioRef,
  minioKeyFromRef,
  parseDataUrl,
  putComplaintPhoto,
  toDataUrl,
  toMinioRef,
} from "../../infrastructure/minio/minio.client";
import {
  assertWardBelongsToEntity,
  resolveLocalEntityId,
} from "./local-entity.scope";

const SLA_HOURS = 24;
const MAX_PHOTO_CHARS = 700_000;

export type ComplaintOperationalStatus = ComplaintStatus | "OVERDUE";

export interface CreateComplaintInput {
  entityId?: string;
  wardId: string;
  title: string;
  titleBn?: string;
  description?: string;
  category?: ComplaintCategory;
  source?: SignalSource;
  severity?: ComplaintSeverity;
  citizenName?: string;
  citizenPhone?: string;
  lat?: number;
  lng?: number;
  locationLabel?: string;
  beforePhotoUrl?: string;
  isRedAlert?: boolean;
  assigneeId?: string;
  /** Optional SLA override from AI triage (hours). */
  slaHours?: number;
}

export interface ResolveComplaintInput {
  afterPhotoUrl: string;
  resolutionNote?: string;
}

const userPick = { id: true, email: true, role: true, phone: true } as const;
const wardPick = { id: true, code: true, name: true, nameBn: true } as const;

function normalizePhotoUrl(url: string | undefined, label: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_PHOTO_CHARS) {
    throw ApiError.badRequest(`${label} exceeds size limit`);
  }
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("data:image/")
  ) {
    throw ApiError.badRequest(`${label} must be https or data:image URL`);
  }
  return trimmed;
}

function photoProxyPath(complaintId: string, kind: "before" | "after"): string {
  return `/local-entity/complaints/${complaintId}/photo/${kind}`;
}

function presentComplaintPhotos<
  T extends { id: string; beforePhotoUrl: string | null; afterPhotoUrl: string | null },
>(row: T): T {
  return {
    ...row,
    beforePhotoUrl: row.beforePhotoUrl ? photoProxyPath(row.id, "before") : null,
    afterPhotoUrl: row.afterPhotoUrl ? photoProxyPath(row.id, "after") : null,
  };
}

async function persistPhoto(
  raw: string | undefined,
  entityId: string,
  kind: "before" | "after",
  label: string,
): Promise<string | undefined> {
  const url = normalizePhotoUrl(raw, label);
  if (!url) return undefined;
  if (!url.startsWith("data:image/") || !isMinioConfigured()) return url;
  try {
    const key = await putComplaintPhoto(entityId, kind, url);
    return toMinioRef(key);
  } catch (err) {
    console.error("[minio] complaint photo put failed; storing inline fallback", err);
    return url;
  }
}

async function materializeForAi(stored: string | null): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith("data:image/") || stored.startsWith("http")) return stored;
  if (!isMinioRef(stored) || !isMinioConfigured()) return stored;
  try {
    const obj = await getMinioObject(minioKeyFromRef(stored));
    return toDataUrl(obj.contentType, obj.body);
  } catch {
    return null;
  }
}

function withOperationalStatus<
  T extends {
    status: ComplaintStatus;
    slaDeadline: Date;
    resolvedAt: Date | null;
  },
>(row: T): T & { operationalStatus: ComplaintOperationalStatus; slaBreached: boolean } {
  const now = new Date();
  const open = row.status !== ComplaintStatus.RESOLVED;
  const slaBreached = open && row.slaDeadline.getTime() < now.getTime();
  return {
    ...row,
    slaBreached,
    operationalStatus: slaBreached ? "OVERDUE" : row.status,
  };
}

async function recordEvent(input: {
  complaintId: string;
  kind: ComplaintEventKind;
  fromStatus?: ComplaintStatus | null;
  toStatus?: ComplaintStatus | null;
  note?: string | null;
  actorUserId?: string | null;
}) {
  await prismaWrite.complaintStatusEvent.create({
    data: {
      complaintId: input.complaintId,
      kind: input.kind,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      note: input.note?.trim() || null,
      actorUserId: input.actorUserId ?? null,
    },
  });
}

export class ComplaintService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: {
      entityId?: string;
      status?: ComplaintStatus | "OVERDUE" | "ALL";
      redAlertOnly?: boolean;
      limit?: number;
    } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const limit = Math.min(opts.limit ?? 50, 100);

    const where: Prisma.CitizenComplaintWhereInput = { entityId };
    if (opts.redAlertOnly) where.isRedAlert = true;

    if (opts.status === "OVERDUE") {
      where.status = { not: ComplaintStatus.RESOLVED };
      where.slaDeadline = { lt: new Date() };
    } else if (opts.status && opts.status !== "ALL") {
      where.status = opts.status;
    }

    const rows = await prismaRead.citizenComplaint.findMany({
      where,
      orderBy: [{ isRedAlert: "desc" }, { slaDeadline: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });

    const mapped = rows.map((row) => presentComplaintPhotos(withOperationalStatus(row)));

    const [open, inProgress, resolved, overdue, redAlerts] = await Promise.all([
      prismaRead.citizenComplaint.count({
        where: { entityId, status: ComplaintStatus.OPEN },
      }),
      prismaRead.citizenComplaint.count({
        where: { entityId, status: ComplaintStatus.IN_PROGRESS },
      }),
      prismaRead.citizenComplaint.count({
        where: { entityId, status: ComplaintStatus.RESOLVED },
      }),
      prismaRead.citizenComplaint.count({
        where: {
          entityId,
          status: { not: ComplaintStatus.RESOLVED },
          slaDeadline: { lt: new Date() },
        },
      }),
      prismaRead.citizenComplaint.count({
        where: {
          entityId,
          isRedAlert: true,
          status: { not: ComplaintStatus.RESOLVED },
        },
      }),
    ]);

    return {
      entityId,
      summary: { open, inProgress, resolved, overdue, redAlerts },
      items: mapped,
    };
  }

  async listAssignees(
    user: { role: UserRole; adminUnitId: string | null },
    entityIdOpt?: string,
  ) {
    const entityId = await resolveLocalEntityId(user, entityIdOpt);
    const users = await prismaRead.user.findMany({
      where: {
        isActive: true,
        OR: [
          { adminUnitId: entityId },
          { role: UserRole.PMO },
        ],
      },
      select: userPick,
      orderBy: [{ role: "asc" }, { email: "asc" }],
      take: 40,
    });
    return { entityId, items: users };
  }

  async timeline(
    user: { role: UserRole; adminUnitId: string | null },
    complaintId: string,
  ) {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);

    const events = await prismaRead.complaintStatusEvent.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: userPick } },
    });

    return {
      complaint: presentComplaintPhotos(withOperationalStatus(existing)),
      events,
    };
  }

  async getPhotoBytes(
    user: { role: UserRole; adminUnitId: string | null },
    complaintId: string,
    kind: "before" | "after",
  ): Promise<{ body: Buffer; contentType: string }> {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
      select: { entityId: true, beforePhotoUrl: true, afterPhotoUrl: true },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);

    const stored = kind === "before" ? existing.beforePhotoUrl : existing.afterPhotoUrl;
    if (!stored) throw ApiError.notFound("Photo not found");

    if (isMinioRef(stored)) {
      try {
        return await getMinioObject(minioKeyFromRef(stored));
      } catch {
        throw ApiError.notFound("Photo object missing");
      }
    }

    const data = parseDataUrl(stored);
    if (data) return data;

    if (stored.startsWith("http://") || stored.startsWith("https://")) {
      const res = await fetch(stored);
      if (!res.ok) throw ApiError.notFound("Photo fetch failed");
      const body = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return { body, contentType };
    }

    throw ApiError.notFound("Photo not found");
  }

  async create(
    user: { role: UserRole; adminUnitId: string | null; id: string },
    input: CreateComplaintInput,
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    await assertWardBelongsToEntity(input.wardId, entityId);

    const severity = input.severity ?? ComplaintSeverity.MEDIUM;
    const isRedAlert =
      input.isRedAlert ??
      (severity === ComplaintSeverity.CRITICAL ||
        severity === ComplaintSeverity.HIGH);

    const slaHours =
      typeof input.slaHours === "number" && Number.isFinite(input.slaHours)
        ? Math.max(6, Math.min(72, Math.round(input.slaHours)))
        : SLA_HOURS;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const beforePhotoUrl = await persistPhoto(
      input.beforePhotoUrl,
      entityId,
      "before",
      "beforePhotoUrl",
    );

    if (input.assigneeId) {
      const assignee = await prismaRead.user.findUnique({ where: { id: input.assigneeId } });
      if (!assignee?.isActive) throw ApiError.badRequest("Invalid assignee");
    }

    const row = await prismaWrite.citizenComplaint.create({
      data: {
        title: input.title.trim(),
        titleBn: input.titleBn?.trim() || null,
        description: input.description?.trim() || null,
        category: input.category ?? ComplaintCategory.OTHER,
        source: input.source ?? SignalSource.CITIZEN,
        severity,
        status: ComplaintStatus.OPEN,
        citizenName: input.citizenName?.trim() || null,
        citizenPhone: input.citizenPhone?.trim() || null,
        lat: input.lat,
        lng: input.lng,
        locationLabel: input.locationLabel?.trim() || null,
        beforePhotoUrl: beforePhotoUrl ?? null,
        slaDeadline,
        isRedAlert: Boolean(isRedAlert),
        wardId: input.wardId,
        entityId,
        assigneeId: input.assigneeId ?? null,
      },
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });

    await recordEvent({
      complaintId: row.id,
      kind: ComplaintEventKind.CREATED,
      toStatus: ComplaintStatus.OPEN,
      note: row.isRedAlert ? "Red alert logged" : "Complaint logged",
      actorUserId: user.id,
    });
    if (row.assigneeId) {
      await recordEvent({
        complaintId: row.id,
        kind: ComplaintEventKind.ASSIGNED,
        toStatus: ComplaintStatus.OPEN,
        note: "Assigned on create",
        actorUserId: user.id,
      });
    }

    if (row.isRedAlert) {
      await publishToGovQueue({
        type: "alert_created",
        adminUnitId: entityId,
        payload: {
          kind: "citizen_complaint",
          complaintId: row.id,
          severity: row.severity,
          title: row.title,
          wardId: row.wardId,
          slaDeadline: row.slaDeadline.toISOString(),
          isRedAlert: true,
        },
      }).catch(() => undefined);

      await alertDeliveryService
        .notifyCrisis({
          entityId,
          sourceKind: "citizen_complaint",
          sourceId: row.id,
          title: row.title,
          detail: row.description ?? undefined,
          severity: row.severity,
          forceVoice: row.severity === ComplaintSeverity.CRITICAL,
        })
        .catch(() => undefined);
    }

    return presentComplaintPhotos(withOperationalStatus(row));
  }

  async assign(
    user: { role: UserRole; adminUnitId: string | null; id: string },
    complaintId: string,
    assigneeId: string | null,
    note?: string,
  ) {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);
    if (existing.status === ComplaintStatus.RESOLVED) {
      throw ApiError.badRequest("Complaint already resolved");
    }
    if (assigneeId) {
      const assignee = await prismaRead.user.findUnique({ where: { id: assigneeId } });
      if (!assignee?.isActive) throw ApiError.badRequest("Invalid assignee");
    }

    const row = await prismaWrite.citizenComplaint.update({
      where: { id: complaintId },
      data: { assigneeId },
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });

    await recordEvent({
      complaintId,
      kind: ComplaintEventKind.ASSIGNED,
      fromStatus: existing.status,
      toStatus: existing.status,
      note: note?.trim() || (assigneeId ? "Assigned" : "Unassigned"),
      actorUserId: user.id,
    });

    return presentComplaintPhotos(withOperationalStatus(row));
  }

  async addNote(
    user: { role: UserRole; adminUnitId: string | null; id: string },
    complaintId: string,
    note: string,
  ) {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);
    const trimmed = note.trim();
    if (trimmed.length < 2) throw ApiError.badRequest("Note too short");

    await recordEvent({
      complaintId,
      kind: ComplaintEventKind.NOTE,
      fromStatus: existing.status,
      toStatus: existing.status,
      note: trimmed,
      actorUserId: user.id,
    });

    return this.timeline(user, complaintId);
  }

  async startProgress(
    user: { role: UserRole; adminUnitId: string | null; id?: string },
    complaintId: string,
  ) {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);

    if (existing.status === ComplaintStatus.RESOLVED) {
      throw ApiError.badRequest("Complaint already resolved");
    }

    const row = await prismaWrite.citizenComplaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.IN_PROGRESS },
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });

    await recordEvent({
      complaintId,
      kind: ComplaintEventKind.STARTED,
      fromStatus: existing.status,
      toStatus: ComplaintStatus.IN_PROGRESS,
      note: "Work started",
      actorUserId: user.id ?? null,
    });

    return presentComplaintPhotos(withOperationalStatus(row));
  }

  async resolve(
    user: { role: UserRole; adminUnitId: string | null; id: string },
    complaintId: string,
    input: ResolveComplaintInput,
  ) {
    const existing = await prismaRead.citizenComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) throw ApiError.notFound("Complaint not found");
    await resolveLocalEntityId(user, existing.entityId);

    if (existing.status === ComplaintStatus.RESOLVED) {
      throw ApiError.badRequest("Complaint already resolved");
    }

    const afterPhotoUrl = await persistPhoto(
      input.afterPhotoUrl,
      existing.entityId,
      "after",
      "afterPhotoUrl",
    );
    if (!afterPhotoUrl) throw ApiError.badRequest("afterPhotoUrl required to close SLA");

    const beforeForQa = await materializeForAi(existing.beforePhotoUrl);
    const afterForQa =
      (await materializeForAi(afterPhotoUrl)) ??
      (input.afterPhotoUrl?.startsWith("data:image/") ? input.afterPhotoUrl : afterPhotoUrl);

    let photoQaStatus: string | null = null;
    let photoQaScore: number | null = null;
    let photoQaNote: string | null = null;
    try {
      const res = await fetchAi(
        "/api/v1/local-ai/photo-qa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: existing.title,
            description: existing.description,
            before_photo_url: beforeForQa,
            after_photo_url: afterForQa,
            resolution_note: input.resolutionNote ?? null,
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (res.ok) {
        const qa = (await res.json()) as {
          status?: string;
          score?: number;
          note_en?: string;
          note_bn?: string;
        };
        photoQaStatus = qa.status ?? null;
        photoQaScore = typeof qa.score === "number" ? qa.score : null;
        photoQaNote = qa.note_bn || qa.note_en || null;
      }
    } catch {
      /* advisory only */
    }

    const row = await prismaWrite.citizenComplaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.RESOLVED,
        afterPhotoUrl,
        resolutionNote: input.resolutionNote?.trim() || null,
        resolvedAt: new Date(),
        resolvedById: user.id,
        photoQaStatus,
        photoQaScore,
        photoQaNote,
      },
      include: {
        ward: { select: wardPick },
        assignee: { select: userPick },
        resolvedBy: { select: userPick },
      },
    });

    await recordEvent({
      complaintId,
      kind: ComplaintEventKind.RESOLVED,
      fromStatus: existing.status,
      toStatus: ComplaintStatus.RESOLVED,
      note:
        input.resolutionNote?.trim() ||
        (photoQaStatus
          ? `Resolved with after photo (QA ${photoQaStatus})`
          : "Resolved with after photo"),
      actorUserId: user.id,
    });

    return presentComplaintPhotos(withOperationalStatus(row));
  }

  async triageSuggest(input: {
    title: string;
    description?: string;
    lang?: "bn" | "en";
  }) {
    const title = input.title.trim();
    if (title.length < 2) throw ApiError.badRequest("title too short");

    const fallback = {
      category: ComplaintCategory.OTHER as ComplaintCategory,
      severity: ComplaintSeverity.MEDIUM as ComplaintSeverity,
      slaHours: 24,
      isRedAlert: false,
      rationaleEn: "Default triage — review category and severity before saving.",
      rationaleBn: "ডিফল্ট ট্রায়াজ — সেভের আগে ক্যাটাগরি ও সিভিয়ারিটি যাচাই করুন।",
      confidence: 0.4,
      llmUsed: false,
    };

    try {
      const res = await fetchAi(
        "/api/v1/local-ai/complaint-triage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: input.description ?? null,
            lang: input.lang ?? "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        category?: string;
        severity?: string;
        sla_hours?: number;
        is_red_alert?: boolean;
        rationale_en?: string;
        rationale_bn?: string;
        confidence?: number;
        llm_used?: boolean;
      };
      const category = Object.values(ComplaintCategory).includes(
        data.category as ComplaintCategory,
      )
        ? (data.category as ComplaintCategory)
        : fallback.category;
      const severity = Object.values(ComplaintSeverity).includes(
        data.severity as ComplaintSeverity,
      )
        ? (data.severity as ComplaintSeverity)
        : fallback.severity;
      return {
        category,
        severity,
        slaHours:
          typeof data.sla_hours === "number"
            ? Math.max(6, Math.min(72, Math.round(data.sla_hours)))
            : 24,
        isRedAlert: Boolean(
          data.is_red_alert ??
            (severity === ComplaintSeverity.HIGH ||
              severity === ComplaintSeverity.CRITICAL),
        ),
        rationaleEn: data.rationale_en || fallback.rationaleEn,
        rationaleBn: data.rationale_bn || fallback.rationaleBn,
        confidence: typeof data.confidence === "number" ? data.confidence : 0.7,
        llmUsed: Boolean(data.llm_used),
      };
    } catch {
      return fallback;
    }
  }
}

export const complaintService = new ComplaintService();
