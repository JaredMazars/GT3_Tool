/**
 * Security Audit Logging Service
 * 
 * Tracks all security-related changes for compliance and debugging.
 * Logs changes to user roles, permissions, service line access, and project assignments.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

/**
 * Audit action types
 */
export enum AuditAction {
  // System Role Actions
  GRANT_SYSTEM_ROLE = 'GRANT_SYSTEM_ROLE',
  REVOKE_SYSTEM_ROLE = 'REVOKE_SYSTEM_ROLE',
  CHANGE_SYSTEM_ROLE = 'CHANGE_SYSTEM_ROLE',
  
  // Service Line Actions
  GRANT_SERVICE_LINE_ACCESS = 'GRANT_SERVICE_LINE_ACCESS',
  REVOKE_SERVICE_LINE_ACCESS = 'REVOKE_SERVICE_LINE_ACCESS',
  CHANGE_SERVICE_LINE_ROLE = 'CHANGE_SERVICE_LINE_ROLE',
  
  // Project Actions
  ASSIGN_PROJECT_USER = 'ASSIGN_PROJECT_USER',
  REMOVE_PROJECT_USER = 'REMOVE_PROJECT_USER',
  CHANGE_PROJECT_ROLE = 'CHANGE_PROJECT_ROLE',
  
  // Permission Actions
  GRANT_PERMISSION = 'GRANT_PERMISSION',
  REVOKE_PERMISSION = 'REVOKE_PERMISSION',
  MODIFY_PERMISSION = 'MODIFY_PERMISSION',
  
  // User Actions
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  ACTIVATE_USER = 'ACTIVATE_USER',
  DEACTIVATE_USER = 'DEACTIVATE_USER',
  
  // Admin Actions
  VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG',
  EXPORT_DATA = 'EXPORT_DATA',
  BULK_OPERATION = 'BULK_OPERATION',
}

/**
 * Audit resource types
 */
export enum AuditResourceType {
  USER = 'USER',
  SYSTEM_ROLE = 'SYSTEM_ROLE',
  SERVICE_LINE = 'SERVICE_LINE',
  SERVICE_LINE_USER = 'SERVICE_LINE_USER',
  PROJECT = 'PROJECT',
  PROJECT_USER = 'PROJECT_USER',
  PERMISSION = 'PERMISSION',
  ROLE_PERMISSION = 'ROLE_PERMISSION',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  userId: string;
  performedBy: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.securityAuditLog.create({
      data: {
        userId: entry.userId,
        performedBy: entry.performedBy,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });

    logger.info('Audit log created', {
      action: entry.action,
      performedBy: entry.performedBy,
      userId: entry.userId,
      resourceType: entry.resourceType,
    });
  } catch (error) {
    logger.error('Failed to create audit log', { entry, error });
    // Don't throw - audit logging failures shouldn't break operations
  }
}

/**
 * Log system role change
 */
export async function logSystemRoleChange(
  userId: string,
  performedBy: string,
  oldRole: string,
  newRole: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.CHANGE_SYSTEM_ROLE,
    resourceType: AuditResourceType.SYSTEM_ROLE,
    resourceId: userId,
    oldValue: oldRole,
    newValue: newRole,
    reason,
    metadata,
  });
}

/**
 * Log service line access grant
 */
export async function logServiceLineAccessGrant(
  userId: string,
  performedBy: string,
  serviceLine: string,
  role: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.GRANT_SERVICE_LINE_ACCESS,
    resourceType: AuditResourceType.SERVICE_LINE_USER,
    resourceId: `${userId}:${serviceLine}`,
    newValue: role,
    reason,
    metadata: { serviceLine, role, ...metadata },
  });
}

/**
 * Log service line access revoke
 */
export async function logServiceLineAccessRevoke(
  userId: string,
  performedBy: string,
  serviceLine: string,
  oldRole: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.REVOKE_SERVICE_LINE_ACCESS,
    resourceType: AuditResourceType.SERVICE_LINE_USER,
    resourceId: `${userId}:${serviceLine}`,
    oldValue: oldRole,
    reason,
    metadata: { serviceLine, oldRole, ...metadata },
  });
}

/**
 * Log service line role change
 */
export async function logServiceLineRoleChange(
  userId: string,
  performedBy: string,
  serviceLine: string,
  oldRole: string,
  newRole: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.CHANGE_SERVICE_LINE_ROLE,
    resourceType: AuditResourceType.SERVICE_LINE_USER,
    resourceId: `${userId}:${serviceLine}`,
    oldValue: oldRole,
    newValue: newRole,
    reason,
    metadata: { serviceLine, ...metadata },
  });
}

/**
 * Log project user assignment
 */
export async function logProjectUserAssignment(
  projectId: number,
  userId: string,
  performedBy: string,
  role: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.ASSIGN_PROJECT_USER,
    resourceType: AuditResourceType.PROJECT_USER,
    resourceId: `${projectId}:${userId}`,
    newValue: role,
    reason,
    metadata: { projectId, role, ...metadata },
  });
}

/**
 * Log project user removal
 */
export async function logProjectUserRemoval(
  projectId: number,
  userId: string,
  performedBy: string,
  oldRole: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.REMOVE_PROJECT_USER,
    resourceType: AuditResourceType.PROJECT_USER,
    resourceId: `${projectId}:${userId}`,
    oldValue: oldRole,
    reason,
    metadata: { projectId, oldRole, ...metadata },
  });
}

/**
 * Log project role change
 */
export async function logProjectRoleChange(
  projectId: number,
  userId: string,
  performedBy: string,
  oldRole: string,
  newRole: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.CHANGE_PROJECT_ROLE,
    resourceType: AuditResourceType.PROJECT_USER,
    resourceId: `${projectId}:${userId}`,
    oldValue: oldRole,
    newValue: newRole,
    reason,
    metadata: { projectId, ...metadata },
  });
}

/**
 * Log permission grant
 */
export async function logPermissionGrant(
  userId: string,
  performedBy: string,
  role: string,
  permissionId: number,
  actions: string[],
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.GRANT_PERMISSION,
    resourceType: AuditResourceType.ROLE_PERMISSION,
    resourceId: `${role}:${permissionId}`,
    newValue: JSON.stringify(actions),
    reason,
    metadata: { role, permissionId, actions, ...metadata },
  });
}

/**
 * Log permission revoke
 */
export async function logPermissionRevoke(
  userId: string,
  performedBy: string,
  role: string,
  permissionId: number,
  oldActions: string[],
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.REVOKE_PERMISSION,
    resourceType: AuditResourceType.ROLE_PERMISSION,
    resourceId: `${role}:${permissionId}`,
    oldValue: JSON.stringify(oldActions),
    reason,
    metadata: { role, permissionId, oldActions, ...metadata },
  });
}

/**
 * Log permission modification
 */
export async function logPermissionModify(
  userId: string,
  performedBy: string,
  role: string,
  permissionId: number,
  oldActions: string[],
  newActions: string[],
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    performedBy,
    action: AuditAction.MODIFY_PERMISSION,
    resourceType: AuditResourceType.ROLE_PERMISSION,
    resourceId: `${role}:${permissionId}`,
    oldValue: JSON.stringify(oldActions),
    newValue: JSON.stringify(newActions),
    reason,
    metadata: { role, permissionId, oldActions, newActions, ...metadata },
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  return prisma.securityAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      User: { select: { name: true, email: true } },
      PerformedBy: { select: { name: true, email: true } },
    },
  });
}

/**
 * Get audit logs by action
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  return prisma.securityAuditLog.findMany({
    where: { action },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      User: { select: { name: true, email: true } },
      PerformedBy: { select: { name: true, email: true } },
    },
  });
}

/**
 * Get audit logs by resource type
 */
export async function getAuditLogsByResourceType(
  resourceType: AuditResourceType,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  return prisma.securityAuditLog.findMany({
    where: { resourceType },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      User: { select: { name: true, email: true } },
      PerformedBy: { select: { name: true, email: true } },
    },
  });
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  return prisma.securityAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      User: { select: { name: true, email: true } },
      PerformedBy: { select: { name: true, email: true } },
    },
  });
}

/**
 * Extract IP address from request headers
 */
export function getIpAddress(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',');
    if (parts[0]) {
      return parts[0].trim();
    }
  }
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}


