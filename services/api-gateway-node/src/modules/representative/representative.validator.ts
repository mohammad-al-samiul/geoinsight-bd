import { z } from "zod";

export const listRepresentativesSchema = z.object({
  unitId: z.string().uuid().optional(),
});

export type ListRepresentativesQuery = z.infer<typeof listRepresentativesSchema>;
