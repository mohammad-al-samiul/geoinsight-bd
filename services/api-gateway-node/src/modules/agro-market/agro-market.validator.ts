import { z } from "zod";

export const listAgroMarketsSchema = z.object({
  unitId: z.string().uuid().optional(),
});

export type ListAgroMarketsQuery = z.infer<typeof listAgroMarketsSchema>;
