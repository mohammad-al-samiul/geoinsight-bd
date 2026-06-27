import { z } from "zod";

export const listRepresentativesSchema = z.object({
  unitId: z.string().uuid(),
});

export type ListRepresentativesQuery = z.infer<typeof listRepresentativesSchema>;
