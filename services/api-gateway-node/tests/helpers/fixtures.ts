import { AdminUnitType, UserRole } from "@prisma/client";

/** Stable UUIDs for hierarchical RBAC drill-down tests */
export const UNIT = {
  division: "11111111-1111-1111-1111-111111111101",
  district: "11111111-1111-1111-1111-111111111102",
  districtOther: "11111111-1111-1111-1111-111111111103",
  upazila: "11111111-1111-1111-1111-111111111104",
  union: "11111111-1111-1111-1111-111111111105",
} as const;

type UnitRow = {
  id: string;
  name: string;
  nameBn: string;
  type: AdminUnitType;
  parentId: string | null;
  path: string;
  geoJson: null;
  children?: UnitRow[];
};

export const UNIT_ROWS: Record<string, UnitRow> = {
  [UNIT.division]: {
    id: UNIT.division,
    name: "Dhaka Division",
    nameBn: "ঢাকা",
    type: AdminUnitType.DIVISION,
    parentId: null,
    path: "/dhaka",
    geoJson: null,
    children: [],
  },
  [UNIT.district]: {
    id: UNIT.district,
    name: "Dhaka District",
    nameBn: "ঢাকা জেলা",
    type: AdminUnitType.DISTRICT,
    parentId: UNIT.division,
    path: "/dhaka/dhaka",
    geoJson: null,
    children: [],
  },
  [UNIT.districtOther]: {
    id: UNIT.districtOther,
    name: "Gazipur District",
    nameBn: "গাজীপুর",
    type: AdminUnitType.DISTRICT,
    parentId: UNIT.division,
    path: "/dhaka/gazipur",
    geoJson: null,
    children: [],
  },
  [UNIT.upazila]: {
    id: UNIT.upazila,
    name: "Savar Upazila",
    nameBn: "সাভার",
    type: AdminUnitType.UPAZILA,
    parentId: UNIT.district,
    path: "/dhaka/dhaka/savar",
    geoJson: null,
    children: [],
  },
  [UNIT.union]: {
    id: UNIT.union,
    name: "Ashulia Union",
    nameBn: "আশুলিয়া",
    type: AdminUnitType.UNION,
    parentId: UNIT.upazila,
    path: "/dhaka/dhaka/savar/ashulia",
    geoJson: null,
  },
};

export function buildJwtPayload(role: UserRole, adminUnitId: string | null) {
  return {
    sub: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@geoinsight.gov.bd`,
    role,
    adminUnitId,
  };
}

export function installPrismaMocks(): void {
  const { prismaRead, prismaWrite } = require("../../src/core/database/prisma.client") as {
    prismaRead: Record<string, Record<string, jest.Mock>>;
    prismaWrite: Record<string, Record<string, jest.Mock>>;
  };

  const attachMocks = (client: Record<string, Record<string, jest.Mock>>) => {
    client.adminUnit.findUnique.mockImplementation(
      (args: { where: { id: string }; select?: unknown; include?: unknown }) => {
        const row = UNIT_ROWS[args.where.id];
        if (!row) return Promise.resolve(null);

        if (args.include && typeof args.include === "object" && "children" in args.include) {
          const childUnits =
            row.type === AdminUnitType.DIVISION
              ? [UNIT_ROWS[UNIT.district], UNIT_ROWS[UNIT.districtOther]]
              : row.type === AdminUnitType.DISTRICT
                ? [UNIT_ROWS[UNIT.upazila]]
                : row.type === AdminUnitType.UPAZILA
                  ? [UNIT_ROWS[UNIT.union]]
                  : [];

          return Promise.resolve({
            ...row,
            children: childUnits.map((c) => ({ ...c, children: c.children ?? [] })),
          });
        }

        if (args.select) {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(args.select as Record<string, boolean>)) {
            if ((args.select as Record<string, boolean>)[key]) {
              picked[key] = row[key as keyof UnitRow];
            }
          }
          return Promise.resolve(picked);
        }

        return Promise.resolve(row);
      },
    );

    client.adminUnit.findMany.mockResolvedValue(Object.values(UNIT_ROWS));
    client.kpiDefinition.findMany.mockResolvedValue([
      { id: "kpi-1", code: "COMPLETION", name: "Completion Rate", unit: "%" },
    ]);
    client.kpiRecord.findMany.mockResolvedValue([]);
    client.redFlagAlert.findMany.mockResolvedValue([]);
    client.redFlagAlert.findUnique.mockResolvedValue(null);
    client.refreshToken.create.mockResolvedValue({});
    client.refreshToken.findUnique.mockResolvedValue(null);
    client.refreshToken.update.mockResolvedValue({});
    client.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  };

  attachMocks(prismaRead);
  attachMocks(prismaWrite);
}
