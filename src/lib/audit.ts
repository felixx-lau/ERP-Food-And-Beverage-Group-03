import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export interface AuditParams {
  actorId?: string;
  actorName: string;
  actorRole: Role;
  action: string;
  documentType: string;
  documentId: string;
  documentNumber?: string;
  beforeState?: Record<string, unknown> | string | null;
  afterState?: Record<string, unknown> | string | null;
  beforeData?: any;
  afterData?: any;
  notes?: string;
  tx?: any;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    const client = params.tx || prisma;

    const rawBefore = params.beforeState ?? params.beforeData;
    const beforeStr = rawBefore
      ? typeof rawBefore === "string"
        ? rawBefore
        : JSON.stringify(rawBefore)
      : null;

    const rawAfter = params.afterState ?? params.afterData;
    const afterStr = rawAfter
      ? typeof rawAfter === "string"
        ? rawAfter
        : JSON.stringify(rawAfter)
      : null;

    // Check if actorId exists in user table to prevent FK violations
    let validActorId: string | null = null;
    if (params.actorId) {
      const userExists = await client.user.findUnique({
        where: { id: params.actorId },
      });
      if (userExists) {
        validActorId = userExists.id;
      }
    }

    const log = await client.auditLog.create({
      data: {
        actorId: validActorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        documentType: params.documentType,
        documentId: params.documentId,
        beforeState: beforeStr,
        afterState: afterStr,
        notes: params.notes,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return null;
  }
}

export const logAudit = recordAuditLog;
