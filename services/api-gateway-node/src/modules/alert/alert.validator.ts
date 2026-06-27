import { z } from "zod";

export const listAlertsSchema = z.object({
  unitId: z.string().uuid().optional(),
  unresolvedOnly: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const resolveAlertSchema = z.object({
  alertId: z.string().uuid(),
});

export type ListAlertsQuery = z.infer<typeof listAlertsSchema>;
