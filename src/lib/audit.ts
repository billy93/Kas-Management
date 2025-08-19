import { prisma } from "@/lib/prisma";

export interface AuditLogData {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details || {},
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || 'unknown'
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

// Common audit actions
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PAYMENT_RECORD: 'PAYMENT_RECORD',
  TRANSACTION_CREATE: 'TRANSACTION_CREATE',
  MEMBER_ADD: 'MEMBER_ADD',
  MEMBER_UPDATE: 'MEMBER_UPDATE',
  MEMBER_DELETE: 'MEMBER_DELETE',
  DUES_CREATE: 'DUES_CREATE',
  ORGANIZATION_UPDATE: 'ORGANIZATION_UPDATE',
  USER_INVITE: 'USER_INVITE',
  USER_DELETE: 'USER_DELETE'
} as const;

// Common entity types
export const ENTITY_TYPES = {
  USER: 'User',
  ORGANIZATION: 'Organization',
  MEMBER: 'Member',
  PAYMENT: 'Payment',
  TRANSACTION: 'Transaction',
  DUES: 'Dues',
  MEMBERSHIP: 'Membership'
} as const;

// Helper function to extract IP and User Agent from request
export function getRequestInfo(req: Request) {
  const headers = req.headers;
  return {
    ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown'
  };
}