import { z } from "zod";

export const createKpiRecordSchema = z.object({
  representativeId: z.string().uuid(),
  kpiDefId: z.string().uuid(),
  value: z.coerce.number().finite(),
  fiscalYear: z.string().length(4).regex(/^\d{4}$/),
  recordedAt: z.coerce.date().optional(),
  verified: z.boolean().optional(),
  blockchainHash: z.string().max(128).optional(),
});

export const listKpiRecordsSchema = z.object({
  representativeId: z.string().uuid().optional(),
  kpiDefId: z.string().uuid().optional(),
  fiscalYear: z.string().length(4).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type CreateKpiRecordDto = z.infer<typeof createKpiRecordSchema>;
export type ListKpiRecordsQuery = z.infer<typeof listKpiRecordsSchema>;
