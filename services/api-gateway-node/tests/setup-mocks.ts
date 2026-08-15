const mockClient = () => ({
  adminUnit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  kpiDefinition: { findMany: jest.fn() },
  kpiRecord: { findMany: jest.fn(), create: jest.fn() },
  representative: { findUnique: jest.fn() },
  redFlagAlert: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  liveSignal: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: { findUnique: jest.fn(), create: jest.fn() },
  $queryRaw: jest.fn().mockResolvedValue([{ version: "2026.08.15.p7", applied_at: new Date("2026-08-15T12:00:00Z") }]),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});

const prismaWrite = mockClient();
const prismaRead = mockClient();

jest.mock("../src/core/database/prisma.client", () => ({
  prismaWrite,
  prismaRead,
  prisma: prismaWrite,
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));
