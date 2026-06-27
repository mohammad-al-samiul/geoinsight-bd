import { z } from "zod";

export const listAgroMarketsSchema = z.object({
  unitId: z.string().uuid(),
});

export type ListAgroMarketsQuery = z.infer<typeof listAgroMarketsSchema>;
