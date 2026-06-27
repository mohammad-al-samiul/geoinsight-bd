jest.mock("../src/core/database/prisma.client", () => ({
  prisma: {
    adminUnit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    kpiDefinition: { findMany: jest.fn() },
    kpiRecord: { findMany: jest.fn(), create: jest.fn() },
    representative: { findUnique: jest.fn() },
    redFlagAlert: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));
