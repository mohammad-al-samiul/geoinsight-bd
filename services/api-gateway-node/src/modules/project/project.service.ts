import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { ListProjectsQuery } from "./project.validator";

export class ProjectService {
  async listByUnit(query: ListProjectsQuery) {
    return prismaRead.project.findMany({
      where: {
        adminUnitId: query.unitId,
        ...(query.status && { status: query.status }),
      },
      select: {
        id: true,
        title: true,
        budgetAllocated: true,
        budgetSpent: true,
        status: true,
        contractorNid: true,
        startDate: true,
        blockchainTx: true,
        adminUnitId: true,
        _count: { select: { redFlagAlerts: true } },
      },
      orderBy: { startDate: "desc" },
    });
  }

  async getById(projectId: string) {
    const project = await prismaRead.project.findUnique({
      where: { id: projectId },
      include: {
        adminUnit: { select: { id: true, name: true, type: true } },
        redFlagAlerts: {
          orderBy: { severity: "desc" },
          take: 10,
        },
      },
    });
    if (!project) throw ApiError.notFound("Project not found");
    return project;
  }
}
