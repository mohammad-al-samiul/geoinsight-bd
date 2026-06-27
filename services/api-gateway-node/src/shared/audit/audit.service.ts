import { Prisma } from "@prisma/client";
import { prisma } from "../../core/database/prisma.client";

export interface AuditEntry {
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export interface IAuditService {
  log(entry: AuditEntry): Promise<void>;
}

export class AuditService implements IAuditService {
  async log(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress,
      },
    });
  }
}

export const auditService = new AuditService();
