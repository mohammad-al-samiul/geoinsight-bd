import { SpecialtySignalStatus, UserRole } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { alertDeliveryService } from "../alert-delivery/alert-delivery.service";
import { catalogByUnitCode } from "./local-entity.catalog";
import { resolveLocalEntityId } from "./local-entity.scope";

export class SpecialtyService {
  async getPack(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; moduleId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true },
    });
    if (!entity) throw ApiError.notFound("Local entity not found");

    const catalog = catalogByUnitCode(entity.code);
    if (!catalog) throw ApiError.notFound("No specialty catalog for entity");

    const modules = catalog.specialtyModules;
    const moduleIds = modules.map((m) => m.id);
    if (opts.moduleId && !moduleIds.includes(opts.moduleId)) {
      throw ApiError.badRequest("moduleId is not part of this entity pack");
    }

    const signals = await prismaRead.localSpecialtySignal.findMany({
      where: {
        entityId,
        ...(opts.moduleId ? { moduleId: opts.moduleId } : { moduleId: { in: moduleIds } }),
      },
      orderBy: [{ recordedAt: "desc" }],
      take: 100,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    const byModule = modules.map((mod) => {
      const rows = signals.filter((s) => s.moduleId === mod.id);
      const alertCount = rows.filter((s) => s.status === SpecialtySignalStatus.ALERT).length;
      const watchCount = rows.filter((s) => s.status === SpecialtySignalStatus.WATCH).length;
      const latestMetric = rows.find((s) => s.metricValue != null) ?? null;
      return {
        module: mod,
        signalCount: rows.length,
        alertCount,
        watchCount,
        latestMetric: latestMetric
          ? {
              label: latestMetric.metricLabel,
              labelBn: latestMetric.metricLabelBn,
              value: latestMetric.metricValue != null ? Number(latestMetric.metricValue) : null,
              unit: latestMetric.metricUnit,
              recordedAt: latestMetric.recordedAt,
            }
          : null,
        signals: rows,
      };
    });

    const alertTotal = signals.filter((s) => s.status === SpecialtySignalStatus.ALERT).length;
    const watchTotal = signals.filter((s) => s.status === SpecialtySignalStatus.WATCH).length;
    const inProgress = signals.filter(
      (s) => s.status === SpecialtySignalStatus.IN_PROGRESS,
    ).length;

    return {
      entityId,
      entityCode: entity.code,
      entityName: entity.name,
      entityNameBn: entity.nameBn,
      role: catalog.role,
      summary: {
        moduleCount: modules.length,
        signalCount: signals.length,
        alertCount: alertTotal,
        watchCount: watchTotal,
        inProgressCount: inProgress,
      },
      modules: byModule,
    };
  }

  /** Wave B4: scan WATCH signals, AI-explain, escalate to ALERT + notify when warranted. */
  async scanAnomalies(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; notify?: boolean } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const candidates = await prismaRead.localSpecialtySignal.findMany({
      where: {
        entityId,
        status: { in: [SpecialtySignalStatus.WATCH, SpecialtySignalStatus.ALERT] },
      },
      orderBy: { recordedAt: "desc" },
      take: 12,
    });

    const findings: Array<{
      signalId: string;
      title: string;
      severity: string;
      shouldAlert: boolean;
      narrativeEn: string;
      narrativeBn: string;
      llmUsed: boolean;
      escalated: boolean;
    }> = [];

    for (const sig of candidates) {
      const metricValue = sig.metricValue != null ? Number(sig.metricValue) : null;
      let severity = "WATCH";
      let shouldAlert = false;
      let narrativeEn = `${sig.title} metric=${metricValue ?? "n/a"}`;
      let narrativeBn = `${sig.titleBn || sig.title} মেট্রিক=${metricValue ?? "ন/া"}`;
      let llmUsed = false;

      try {
        const res = await fetchAi(
          "/api/v1/local-ai/anomaly-explain",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: sig.title,
              title_bn: sig.titleBn,
              detail: sig.detail,
              metric_label: sig.metricLabel,
              metric_value: metricValue,
              metric_unit: sig.metricUnit,
              status: sig.status,
              lang: "bn",
            }),
          },
          { timeoutMs: AI_FETCH_LLM_MS },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            severity?: string;
            narrative_en?: string;
            narrative_bn?: string;
            should_alert?: boolean;
            llm_used?: boolean;
          };
          severity = data.severity || severity;
          shouldAlert = Boolean(data.should_alert);
          if (data.narrative_en) narrativeEn = data.narrative_en;
          if (data.narrative_bn) narrativeBn = data.narrative_bn;
          llmUsed = Boolean(data.llm_used);
        }
      } catch {
        if (metricValue != null && metricValue >= 80) {
          shouldAlert = true;
          severity = metricValue >= 95 ? "CRITICAL" : "ALERT";
        }
      }

      let escalated = false;
      if (
        shouldAlert &&
        severity !== "WATCH" &&
        sig.status !== SpecialtySignalStatus.ALERT
      ) {
        await prismaWrite.localSpecialtySignal.update({
          where: { id: sig.id },
          data: {
            status: SpecialtySignalStatus.ALERT,
            detail: `${sig.detail ?? ""}\n[AI] ${narrativeEn}`.trim().slice(0, 4000),
            detailBn: `${sig.detailBn ?? ""}\n[AI] ${narrativeBn}`.trim().slice(0, 4000),
          },
        });
        escalated = true;
        if (opts.notify !== false) {
          await alertDeliveryService
            .notifyCrisis({
              entityId,
              sourceKind: "specialty_signal",
              sourceId: sig.id,
              title: sig.title,
              detail: narrativeBn || narrativeEn,
              severity,
            })
            .catch(() => null);
        }
      }

      findings.push({
        signalId: sig.id,
        title: sig.title,
        severity,
        shouldAlert,
        narrativeEn,
        narrativeBn,
        llmUsed,
        escalated,
      });
    }

    return {
      entityId,
      scanned: candidates.length,
      escalated: findings.filter((f) => f.escalated).length,
      findings,
    };
  }
}

export const specialtyService = new SpecialtyService();
