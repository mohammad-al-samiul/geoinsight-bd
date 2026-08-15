import {
  AlertDeliveryStatus,
  ComplaintStatus,
  ServiceOutageStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";

export type DeskAlertKind =
  | "RED_ALERT"
  | "SLA_OVERDUE"
  | "OUTAGE_OVERDUE"
  | "DELIVERY_FAILED";

export class DeskAlertsService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; limit?: number } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const cap = Math.min(opts.limit ?? 40, 80);
    const now = new Date();

    const [red, overdue, failed, outages] = await Promise.all([
      prismaRead.citizenComplaint.findMany({
        where: {
          entityId,
          isRedAlert: true,
          status: { not: ComplaintStatus.RESOLVED },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          titleBn: true,
          severity: true,
          createdAt: true,
        },
      }),
      prismaRead.citizenComplaint.findMany({
        where: {
          entityId,
          isRedAlert: false,
          status: { not: ComplaintStatus.RESOLVED },
          slaDeadline: { lt: now },
        },
        orderBy: { slaDeadline: "asc" },
        take: 20,
        select: {
          id: true,
          title: true,
          titleBn: true,
          slaDeadline: true,
        },
      }),
      prismaRead.alertDeliveryLog.findMany({
        where: { entityId, status: AlertDeliveryStatus.FAILED },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          bodyPreview: true,
          error: true,
          createdAt: true,
        },
      }),
      prismaRead.localServiceOutage.findMany({
        where: {
          entityId,
          status: { not: ServiceOutageStatus.RESOLVED },
          etaRestoreAt: { lt: now },
        },
        orderBy: { etaRestoreAt: "asc" },
        take: 10,
        select: {
          id: true,
          title: true,
          titleBn: true,
          createdAt: true,
          etaRestoreAt: true,
        },
      }),
    ]);

    const items = [
      ...red.map((row) => ({
        id: `red:${row.id}`,
        kind: "RED_ALERT" as const,
        severity: row.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        headline: row.title,
        headlineBn: row.titleBn ?? row.title,
        detail: "Open red-alert complaint",
        detailBn: "খোলা জরুরি অভিযোগ",
        href: "/local/complaints",
        createdAt: row.createdAt.toISOString(),
      })),
      ...overdue.map((row) => ({
        id: `sla:${row.id}`,
        kind: "SLA_OVERDUE" as const,
        severity: "HIGH" as const,
        headline: row.title,
        headlineBn: row.titleBn ?? row.title,
        detail: "SLA deadline passed",
        detailBn: "সময়সীমা পেরিয়েছে",
        href: "/local/complaints",
        createdAt: row.slaDeadline.toISOString(),
      })),
      ...outages.map((row) => ({
        id: `outage:${row.id}`,
        kind: "OUTAGE_OVERDUE" as const,
        severity: "HIGH" as const,
        headline: row.title,
        headlineBn: row.titleBn ?? row.title,
        detail: "Restore ETA overdue",
        detailBn: "পুনরুদ্ধার সময় পেরিয়েছে",
        href: "/local/outage",
        createdAt: (row.etaRestoreAt ?? row.createdAt).toISOString(),
      })),
      ...failed.map((row) => ({
        id: `delivery:${row.id}`,
        kind: "DELIVERY_FAILED" as const,
        severity: "MEDIUM" as const,
        headline: row.bodyPreview.slice(0, 80),
        headlineBn: row.bodyPreview.slice(0, 80),
        detail: row.error ?? "Alert delivery failed",
        detailBn: row.error ?? "অ্যালার্ট পাঠানো যায়নি",
        href: "/local/alerts",
        createdAt: row.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, cap);

    return {
      entityId,
      generatedAt: now.toISOString(),
      summary: {
        red: red.length,
        slaOverdue: overdue.length,
        outageOverdue: outages.length,
        deliveryFailed: failed.length,
      },
      items,
    };
  }
}

export const deskAlertsService = new DeskAlertsService();
