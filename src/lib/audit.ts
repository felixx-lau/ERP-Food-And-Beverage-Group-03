import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export interface AuditParams {
  actorId?: string;
  actorName: string;
  actorRole: Role;
  action: string;
  documentType: string;
  documentId: string;
  beforeState?: Record<string, unknown> | string | null;
  afterState?: Record<string, unknown> | string | null;
  notes?: string;
}

export async function recordAuditLog(params: AuditParams) {
  try {
    const beforeStr = params.beforeState
      ? typeof params.beforeState === "string"
        ? params.beforeState
        : JSON.stringify(params.beforeState)
      : null;

    const afterStr = params.afterState
      ? typeof params.afterState === "string"
        ? params.afterState
        : JSON.stringify(params.afterState)
      : null;

    // Check if actorId exists in user table to prevent FK violations
    let validActorId: string | null = null;
    if (params.actorId) {
      const userExists = await prisma.user.findUnique({
        where: { id: params.actorId },
      });
      if (userExists) {
        validActorId = userExists.id;
      }
    }

    const log = await prisma.auditLog.create({
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
