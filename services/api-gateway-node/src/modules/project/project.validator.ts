import { z } from "zod";
import { ProjectStatus } from "@prisma/client";

export const listProjectsSchema = z.object({
  unitId: z.string().uuid(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsSchema>;
