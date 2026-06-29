import { Prisma } from "@prisma/client";
import { prismaWrite, prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { CreateKpiRecordDto, ListKpiRecordsQuery } from "./kpi.validator";

export class KpiService {
  async listDefinitions() {
    return prismaRead.kpiDefinition.findMany({
      select: { id: true, code: true, name: true, unit: true, appliesTo: true },
      orderBy: { code: "asc" },
    });
  }

  async listRecords(query: ListKpiRecordsQuery) {
    return prismaRead.kpiRecord.findMany({
      where: {
        ...(query.representativeId && { representativeId: query.representativeId }),
        ...(query.kpiDefId && { kpiDefId: query.kpiDefId }),
        ...(query.fiscalYear && { fiscalYear: query.fiscalYear }),
        ...(query.unitId && {
          representative: {
            OR: [
              { adminUnitId: query.unitId },
              {
                adminUnit: {
                  OR: [
                    { id: query.unitId },
                    { divisionId: query.unitId },
                    { districtId: query.unitId },
                    { upazilaId: query.unitId },
                    { parentId: query.unitId },
                  ],
                },
              },
            ],
          },
        }),
      },
      include: {
        kpiDef: { select: { code: true, name: true, unit: true } },
        representative: {
          select: {
            id: true,
            name: true,
            role: true,
            party: true,
            adminUnitId: true,
            adminUnit: { select: { id: true, name: true, nameBn: true, type: true } },
          },
        },
      },
      orderBy: { recordedAt: "desc" },
      take: query.limit,
    });
  }

  async createRecord(input: CreateKpiRecordDto) {
    const rep = await prismaRead.representative.findUnique({
      where: { id: input.representativeId },
    });
    if (!rep) throw ApiError.notFound("Representative not found");

    const def = await prismaRead.kpiDefinition.findUnique({ where: { id: input.kpiDefId } });
    if (!def) throw ApiError.notFound("KPI definition not found");

    return prismaWrite.kpiRecord.create({
      data: {
        representativeId: input.representativeId,
        kpiDefId: input.kpiDefId,
        value: new Prisma.Decimal(input.value),
        fiscalYear: input.fiscalYear,
        recordedAt: input.recordedAt ?? new Date(),
        verified: input.verified ?? false,
        blockchainHash: input.blockchainHash,
      },
      include: {
        kpiDef: true,
        representative: { select: { id: true, name: true, adminUnitId: true } },
      },
    });
  }

  /** Resolve admin unit for RBAC scoping via representative. */
  async resolveAdminUnitId(representativeId: string): Promise<string> {
    const rep = await prismaRead.representative.findUnique({
      where: { id: representativeId },
      select: { adminUnitId: true },
    });
    if (!rep) throw ApiError.notFound("Representative not found");
    return rep.adminUnitId;
  }
}
