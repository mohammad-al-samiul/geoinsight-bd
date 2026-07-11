import { apiClient } from "@/lib/api-client";
import { getUnitById } from "@/lib/admin-units";
import { resolveUnitName } from "@/lib/unit-names";
import { unitSearchParams } from "@/lib/unit-scope";
import type { AdminFilterState } from "@/types";
import type { AnomalyAlert } from "@/types/alerts";
import {
  deriveVerificationStatus,
  severityFromInt,
} from "@/types/alerts";

interface ApiAlertRow {
  id: string;
  flagType: string;
  severity: number;
  aiExplanation: string | null;
  resolvedAt: string | null;
  createdAt: string;
  blockchainHash: string | null;
  blockchainVerified: boolean;
  live?: boolean;
  sourceName?: string | null;
  sourceUrl?: string | null;
  district?: string;
  project: {
    id: string;
    title: string;
    adminUnitId: string;
    blockchainTx: string | null;
  };
}

function buildHeadline(row: ApiAlertRow, unitName: string): string {
  const severity = severityFromInt(row.severity);
  const prefix = severity === "CRITICAL" ? "Critical" : severity;
  const typeLabel = row.flagType.replace(/_/g, " ").toLowerCase();

  if (row.flagType === "BUDGET_OVERRUN") {
    return `${prefix}: Budget variance > 25% detected — ${row.project.title} in ${unitName}`;
  }
  if (row.flagType === "CONTRACTOR_FRAUD") {
    return `${prefix}: Contractor anomaly flagged in ${unitName}`;
  }
  return `${prefix}: ${typeLabel} — ${row.project.title} (${unitName})`;
}

function mapApiAlert(row: ApiAlertRow): AnomalyAlert {
  const unitName = row.district
    ?? getUnitById(row.project.adminUnitId)?.name
    ?? resolveUnitName(row.project.adminUnitId);

  return {
    id: row.id,
    headline: buildHeadline(row, unitName),
    detail: row.aiExplanation ?? "AI engine detected an administrative infraction.",
    severity: severityFromInt(row.severity),
    flagType: row.flagType,
    adminUnitId: row.project.adminUnitId,
    unitName,
    projectId: row.project.id,
    projectTitle: row.project.title,
    contractorName: row.flagType.includes("CONTRACTOR") ? "Contractor X" : undefined,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    blockchainHash: row.blockchainHash,
    blockchainVerified: row.blockchainVerified,
    fabricTxId: row.project.blockchainTx,
    live: row.live,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    verificationStatus: deriveVerificationStatus({
      blockchainHash: row.blockchainHash,
      blockchainVerified: row.blockchainVerified,
      fabricTxId: row.project.blockchainTx,
    }),
  };
}

export async function fetchAnomalyAlerts(
  filter: AdminFilterState,
): Promise<AnomalyAlert[]> {
  const params = unitSearchParams(filter, { unresolvedOnly: "true", limit: "50" });

  const json = await apiClient<{ success: boolean; data: ApiAlertRow[] }>(
    `alerts?${params}`,
  );

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error("Alerts API returned no data");
  }
  return json.data.map(mapApiAlert);
}

export function mapSocketPayloadToAlert(
  payload: Record<string, unknown>,
  adminUnitId: string,
): AnomalyAlert {
  const severity = severityFromInt(Number(payload.severity ?? 3));
  const flagType = String(payload.flagType ?? "OTHER");
  const unit = getUnitById(adminUnitId);
  const unitName = unit?.name ?? "Administrative Unit";
  const projectTitle = String(payload.projectTitle ?? "Flagged Project");

  const row: ApiAlertRow = {
    id: String(payload.alertId ?? `live-${Date.now()}`),
    flagType,
    severity: Number(payload.severity ?? 3),
    aiExplanation: String(
      payload.aiExplanation ?? "Real-time AI anomaly detected.",
    ),
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    blockchainHash: (payload.blockchainHash as string) ?? null,
    blockchainVerified: Boolean(payload.blockchainVerified),
    project: {
      id: String(payload.projectId ?? "unknown"),
      title: projectTitle,
      adminUnitId,
      blockchainTx: (payload.fabricTxId as string) ?? null,
    },
  };

  return { ...mapApiAlert(row), isNew: true };
}
