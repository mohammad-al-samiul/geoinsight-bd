import { apiClient } from "@/lib/api-client";
import { getUnitById } from "@/lib/admin-units";
import { resolveUnitName } from "@/lib/unit-names";
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
  const unitName = getUnitById(row.project.adminUnitId)?.name
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
    verificationStatus: deriveVerificationStatus({
      blockchainHash: row.blockchainHash,
      blockchainVerified: row.blockchainVerified,
      fabricTxId: row.project.blockchainTx,
    }),
  };
}

const MOCK_ALERTS: AnomalyAlert[] = [
  {
    id: "demo-1",
    headline: "Critical: Budget Variance > 25% detected for Contractor X in Ashulia Union",
    detail:
      "AI model flagged a 28.4% spend overrun on rural infrastructure contract. Pattern matches historical fraud cluster #BD-441.",
    severity: "CRITICAL",
    flagType: "BUDGET_OVERRUN",
    adminUnitId: "uni-ashulia",
    unitName: "Ashulia",
    projectId: "proj-demo-1",
    projectTitle: "Union Rural Roads Phase II",
    contractorName: "Contractor X",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    blockchainHash: "a3f8c2e91b047d6e5f0a8c3d2e1f9b4a7c6d5e8f0a1b2c3d4e5f6a7b8c9d0e1",
    blockchainVerified: true,
    fabricTxId: "fabric-tx-9f2a1b3c4d5e6f70",
    verificationStatus: "VERIFIED",
  },
  {
    id: "demo-2",
    headline: "High: Delay risk on Metro Rail P6 in Keraniganj",
    detail: "Schedule slip probability 73%. Critical path activity behind by 18 days.",
    severity: "HIGH",
    flagType: "DELAY",
    adminUnitId: "upa-keraniganj",
    unitName: "Keraniganj",
    projectId: "proj-demo-2",
    projectTitle: "Metro Rail Package 6",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    resolvedAt: null,
    blockchainHash: "b4e9d3f02c158e7f6a1b9d4e3f0a8c5b8d7e6f9a0b1c2d3e4f5a6b7c8d9e0f2",
    blockchainVerified: false,
    fabricTxId: null,
    verificationStatus: "PENDING",
  },
  {
    id: "demo-3",
    headline: "Medium: Quality deviation at Tongi irrigation scheme",
    detail: "Sentiment + field imagery correlation suggests sub-standard material usage.",
    severity: "MEDIUM",
    flagType: "QUALITY",
    adminUnitId: "upa-tongi",
    unitName: "Tongi",
    projectId: "proj-demo-3",
    projectTitle: "Tongi Irrigation Rehabilitation",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    resolvedAt: null,
    blockchainHash: null,
    blockchainVerified: false,
    fabricTxId: null,
    verificationStatus: "UNANCHORED",
  },
];

export async function fetchAnomalyAlerts(
  filter: AdminFilterState,
): Promise<AnomalyAlert[]> {
  try {
    const params = new URLSearchParams({ unresolvedOnly: "true", limit: "50" });
    const active =
      filter.unionId ??
      filter.upazilaId ??
      filter.districtId ??
      filter.divisionId;
    if (active) params.set("unitId", active);

    const json = await apiClient<{ success: boolean; data: ApiAlertRow[] }>(
      `alerts?${params}`,
    );

    if (!json.success || !Array.isArray(json.data)) throw new Error("No data");
    return json.data.map(mapApiAlert);
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_ALERTS;
  }
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
