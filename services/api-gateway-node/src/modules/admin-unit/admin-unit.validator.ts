import { z } from "zod";

export const unitIdParamSchema = z.object({
  unitId: z.string().uuid(),
});

export type UnitIdParam = z.infer<typeof unitIdParamSchema>;
