import { LiveSignalType } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";

export class AuditTrailService {
  async listAiAuditTrail(limit = 50) {
    if (env.LIVE_DATA_ONLY) {
      const [signals, audits] = await Promise.all([
        prismaRead.liveSignal.findMany({
          where: { signalType: LiveSignalType.ALERT },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        prismaRead.auditLog.findMany({
          where: {
            OR: [
              { action: { contains: "AI" } },
              { action: "RESOLVE", tableName: { in: ["live_signals", "red_flag_alerts"] } },
            ],
          },
          include: { user: { select: { email: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      ]);

      const timeline = [
        ...signals.map((s) => ({
          type: "ai_alert" as const,
          id: s.id,
          timestamp: s.createdAt.toISOString(),
          projectTitle: s.title.slice(0, 100),
          flagType: s.flagType ?? "OTHER",
          severity: s.severity ?? 3,
          aiExplanation: s.body ?? s.title,
          blockchainHash: null,
          blockchainVerified: false,
          fabricTx: null,
          sourceName: s.sourceName,
          sourceUrl: s.url,
          resolvedAt: s.resolvedAt?.toISOString() ?? null,
          resolvedBy: null,
        })),
        ...audits.map((log) => ({
          type: "audit" as const,
          id: String(log.id),
          timestamp: log.createdAt.toISOString(),
          action: log.action,
          tableName: log.tableName,
          recordId: log.recordId,
          actor: log.user.email,
          actorRole: log.user.role,
          newValue: log.newValue,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        timeline: timeline.slice(0, limit),
        alert_count: signals.length,
        audit_count: audits.length,
        dataSource: "live_pipeline",
      };
    }

    const [alerts, audits] = await Promise.all([
      prismaRead.redFlagAlert.findMany({
        where: { aiExplanation: { not: null } },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              adminUnitId: true,
              blockchainTx: true,
            },
          },
          resolvedBy: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prismaRead.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: "AI" } },
            { action: "RESOLVE", tableName: "red_flag_alerts" },
          ],
        },
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const timeline = [
      ...alerts.map((a) => ({
        type: "ai_alert" as const,
        id: a.id,
        timestamp: a.createdAt.toISOString(),
        projectTitle: a.project.title,
        flagType: a.flagType,
        severity: a.severity,
        aiExplanation: a.aiExplanation,
        blockchainHash: a.blockchainHash,
        blockchainVerified: a.blockchainVerified,
        fabricTx: a.project.blockchainTx,
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
        resolvedBy: a.resolvedBy?.email ?? null,
      })),
      ...audits.map((log) => ({
        type: "audit" as const,
        id: String(log.id),
        timestamp: log.createdAt.toISOString(),
        action: log.action,
        tableName: log.tableName,
        recordId: log.recordId,
        actor: log.user.email,
        actorRole: log.user.role,
        newValue: log.newValue,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      timeline: timeline.slice(0, limit),
      alert_count: alerts.length,
      audit_count: audits.length,
    };
  }
}

export const auditTrailService = new AuditTrailService();
