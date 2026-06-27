import { z } from "zod";

export const submitMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  representativeId: z.string().uuid(),
  allocatedBudget: z.coerce.number().nonnegative(),
  spendingVariance: z.coerce.number(),
  progressPercentage: z.coerce.number().min(0).max(100),
});

export type SubmitMilestoneDto = z.infer<typeof submitMilestoneSchema>;

export const queueIdParamSchema = z.object({
  queueId: z.string().uuid(),
});
