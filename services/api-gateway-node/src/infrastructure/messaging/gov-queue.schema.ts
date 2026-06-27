import { z } from "zod";

export const govQueueMessageSchema = z.object({
  type: z.enum(["kpi_update", "metadata_update", "dashboard_refresh", "alert_created"]),
  adminUnitId: z.string().uuid(),
  payload: z.record(z.unknown()),
});

export type GovQueueMessage = z.infer<typeof govQueueMessageSchema>;
