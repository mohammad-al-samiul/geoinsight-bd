-- Align IntelSnapshotKind with Prisma schema (outlook snapshots)
ALTER TYPE "IntelSnapshotKind" ADD VALUE IF NOT EXISTS 'OUTLOOK';
