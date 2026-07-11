export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BlockchainVerificationStatus =
  | "VERIFIED"
  | "PENDING"
  | "UNANCHORED"
  | "MISMATCH";

export interface AnomalyAlert {
  id: string;
  headline: string;
  detail: string;
  severity: AlertSeverity;
  flagType: string;
  adminUnitId: string;
  unitName: string;
  projectId: string;
  projectTitle: string;
  contractorName?: string;
  createdAt: string;
  resolvedAt: string | null;
  blockchainHash: string | null;
  blockchainVerified: boolean;
  fabricTxId: string | null;
  verificationStatus: BlockchainVerificationStatus;
  isNew?: boolean;
  live?: boolean;
  sourceName?: string | null;
  sourceUrl?: string | null;
}

export function severityFromInt(level: number): AlertSeverity {
  if (level >= 4) return "CRITICAL";
  if (level >= 3) return "HIGH";
  if (level >= 2) return "MEDIUM";
  return "LOW";
}

export function deriveVerificationStatus(alert: {
  blockchainHash: string | null;
  blockchainVerified: boolean;
  fabricTxId: string | null;
}): BlockchainVerificationStatus {
  if (alert.blockchainVerified && alert.fabricTxId && alert.blockchainHash) {
    return "VERIFIED";
  }
  if (alert.blockchainHash && alert.fabricTxId) return "PENDING";
  if (alert.blockchainHash) return "PENDING";
  return "UNANCHORED";
}
