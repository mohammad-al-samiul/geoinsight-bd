import { createHash } from "crypto";

export interface MilestonePayload {
  projectId: string;
  representativeId: string;
  allocatedBudget: string;
  spendingVariance: string;
  progressPercentage: string;
}

/** Deterministic SHA-256 over canonical milestone fields (tamper-evident fingerprint). */
export function hashMilestonePayload(payload: MilestonePayload): string {
  const canonical = JSON.stringify({
    allocatedBudget: payload.allocatedBudget,
    progressPercentage: payload.progressPercentage,
    projectId: payload.projectId,
    representativeId: payload.representativeId,
    spendingVariance: payload.spendingVariance,
  });

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildMilestonePayload(input: {
  projectId: string;
  representativeId: string;
  allocatedBudget: number | string;
  spendingVariance: number | string;
  progressPercentage: number | string;
}): MilestonePayload {
  return {
    projectId: input.projectId,
    representativeId: input.representativeId,
    allocatedBudget: String(input.allocatedBudget),
    spendingVariance: String(input.spendingVariance),
    progressPercentage: String(input.progressPercentage),
  };
}
