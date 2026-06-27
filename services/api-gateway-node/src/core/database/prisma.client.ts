import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const globalForPrisma = globalThis as unknown as {
  prismaWrite?: PrismaClient;
  prismaRead?: PrismaClient;
};

function createWriteClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function createReadClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_READ_URL } },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Primary — writes, migrations, auth token persistence */
export const prismaWrite =
  globalForPrisma.prismaWrite ?? createWriteClient();

/** Read replica — analytical dashboard queries */
export const prismaRead =
  globalForPrisma.prismaRead ?? createReadClient();

/** @deprecated Use prismaWrite / prismaRead explicitly */
export const prisma = prismaWrite;

if (env.NODE_ENV !== "production") {
  globalForPrisma.prismaWrite = prismaWrite;
  globalForPrisma.prismaRead = prismaRead;
}

export async function connectDatabase(): Promise<void> {
  await Promise.all([prismaWrite.$connect(), prismaRead.$connect()]);
}

export async function disconnectDatabase(): Promise<void> {
  await Promise.all([prismaWrite.$disconnect(), prismaRead.$disconnect()]);
}
