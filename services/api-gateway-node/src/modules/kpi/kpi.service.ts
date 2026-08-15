import { Prisma } from "@prisma/client";

import { env } from "../../core/config/env";
import { prismaWrite, prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { kpiProvenance } from "../../shared/provenance";
import { CreateKpiRecordDto, ListKpiRecordsQuery } from "./kpi.validator";



export class KpiService {

  async listDefinitions() {

    return prismaRead.kpiDefinition.findMany({

      select: { id: true, code: true, name: true, unit: true, appliesTo: true },

      orderBy: { code: "asc" },

    });

  }



  async listRecords(query: ListKpiRecordsQuery) {

    const pipelineOnly = env.LIVE_DATA_ONLY

      ? { blockchainHash: { startsWith: "pipeline:" } }

      : {};



    const rows = await prismaRead.kpiRecord.findMany({

      where: {

        ...pipelineOnly,

        ...(query.representativeId && { representativeId: query.representativeId }),

        ...(query.kpiDefId && { kpiDefId: query.kpiDefId }),

        ...(query.fiscalYear && { fiscalYear: query.fiscalYear }),

        // Only current-mandate duty-holders — never Awami League KPI rows
        representative: {
          NOT: { party: { contains: "Awami", mode: "insensitive" } },
          OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
          ...(query.unitId
            ? {
                AND: [
                  {
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
                ],
              }
            : {}),
        },

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

      take: Math.min(query.limit ?? 200, 500),

    });



    if (!env.LIVE_DATA_ONLY) {
      return rows.slice(0, query.limit).map((row) => ({
        ...row,
        provenance: kpiProvenance(row.blockchainHash),
      }));
    }

    const latest = new Map<string, (typeof rows)[number]>();

    for (const row of rows) {

      const key = `${row.representativeId}:${row.kpiDef.code}`;

      if (!latest.has(key)) latest.set(key, row);

    }

    return [...latest.values()]

      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())

      .slice(0, query.limit)

      .map((row) => ({
        ...row,
        provenance: kpiProvenance(row.blockchainHash),
      }));

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


