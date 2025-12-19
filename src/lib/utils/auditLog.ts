/**
 * Audit Logging Service
 * 
 * Provides structured audit logging for sensitive operations.
 * Currently logs to structured logger - can be extended to persist to database.
 * 
 * To enable database persistence, add AuditLog model to prisma/schema.prisma:
 * ```
 * model AuditLog {
 *   id         Int      @id @default(autoincrement())
 *   eventType  String   @db.VarChar(50)
 *   userId     String   @db.VarChar(255)
 *   ipAddress  String?  @db.VarChar(50)
 *   userAgent  String?  @db.VarChar(500)
 *   targetType String?  @db.VarChar(50)
 *   targetId   String?  @db.VarChar(255)
 *   details    String?  @db.NVarChar(Max)
 *   severity   String   @db.VarChar(20)
 *   createdAt  DateTime @default(now())
 * }
 * ```
 */

import { logger } from './logger';

/**
 * Audit event types for categorization
 */
export const AuditEventType = {
  // Authentication events
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  
  // Service line access
  SERVICE_LINE_ACCESS_GRANTED: 'SERVICE_LINE_ACCESS_GRANTED',
  SERVICE_LINE_ACCESS_REVOKED: 'SERVICE_LINE_ACCESS_REVOKED',
  SERVICE_LINE_ROLE_CHANGED: 'SERVICE_LINE_ROLE_CHANGED',
  
  // Task operations
  TASK_CREATED: 'TASK_CREATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_TEAM_MEMBER_ADDED: 'TASK_TEAM_MEMBER_ADDED',
  TASK_TEAM_MEMBER_REMOVED: 'TASK_TEAM_MEMBER_REMOVED',
  TASK_APPROVAL_GRANTED: 'TASK_APPROVAL_GRANTED',
  TASK_APPROVAL_REJECTED: 'TASK_APPROVAL_REJECTED',
  
  // Document operations
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
  
  // Admin operations
  ADMIN_SETTINGS_CHANGED: 'ADMIN_SETTINGS_CHANGED',
  PAGE_PERMISSIONS_CHANGED: 'PAGE_PERMISSIONS_CHANGED',
  
  // Security events
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
} as const;

export type AuditEventType = typeof AuditEventType[keyof typeof AuditEventType];

/**
 * Severity levels for audit events
 */
export const AuditSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type AuditSeverity = typeof AuditSeverity[keyof typeof AuditSeverity];

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  /** Event type */
  eventType: AuditEventType;
  
  /** ID of the user who performed the action */
  userId: string;
  
  /** IP address of the request */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Target entity type (e.g., 'user', 'task', 'client') */
  targetType?: string;
  
  /** Target entity ID */
  targetId?: string;
  
  /** Additional details about the event */
  details?: Record<string, unknown>;
  
  /** Severity level */
  severity?: AuditSeverity;
}

/**
 * Log an audit event
 * 
 * @param entry - Audit log entry
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const {
    eventType,
    userId,
    ipAddress,
    userAgent,
    targetType,
    targetId,
    details,
    severity = AuditSeverity.INFO,
  } = entry;

  // Log to structured logger with audit tag for easy filtering/monitoring
  const logLevel = severity === AuditSeverity.CRITICAL ? 'error' 
    : severity === AuditSeverity.WARNING ? 'warn' 
    : 'info';
  
  const logData = {
    audit: true, // Tag for filtering in log aggregation
    eventType,
    userId,
    ipAddress,
    userAgent: userAgent?.substring(0, 200), // Truncate long user agents
    targetType,
    targetId,
    severity,
    timestamp: new Date().toISOString(),
    ...details,
  };

  switch (logLevel) {
    case 'error':
      logger.error(`[AUDIT] ${eventType}`, logData);
      break;
    case 'warn':
      logger.warn(`[AUDIT] ${eventType}`, logData);
      break;
    default:
      logger.info(`[AUDIT] ${eventType}`, logData);
  }
  
  // TODO: Add database persistence when AuditLog model is added to schema
  // See module documentation for schema definition
}

/**
 * Convenience functions for common audit events
 */

export async function auditUserRoleChange(
  actorId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.USER_ROLE_CHANGED,
    userId: actorId,
    targetType: 'user',
    targetId: targetUserId,
    ipAddress,
    severity: AuditSeverity.WARNING,
    details: {
      oldRole,
      newRole,
    },
  });
}

export async function auditServiceLineAccessChange(
  actorId: string,
  targetUserId: string,
  serviceLineCode: string,
  action: 'granted' | 'revoked',
  role?: string,
  ipAddress?: string
): Promise<void> {
  const eventType = action === 'granted' 
    ? AuditEventType.SERVICE_LINE_ACCESS_GRANTED 
    : AuditEventType.SERVICE_LINE_ACCESS_REVOKED;
    
  await logAuditEvent({
    eventType,
    userId: actorId,
    targetType: 'user',
    targetId: targetUserId,
    ipAddress,
    severity: AuditSeverity.WARNING,
    details: {
      serviceLineCode,
      role,
    },
  });
}

export async function auditTaskDeletion(
  actorId: string,
  taskId: number,
  taskCode: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.TASK_DELETED,
    userId: actorId,
    targetType: 'task',
    targetId: String(taskId),
    ipAddress,
    severity: AuditSeverity.WARNING,
    details: {
      taskCode,
    },
  });
}

export async function auditAdminAction(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.ADMIN_SETTINGS_CHANGED,
    userId: actorId,
    targetType,
    targetId,
    ipAddress,
    severity: AuditSeverity.CRITICAL,
    details: {
      action,
      ...details,
    },
  });
}

export async function auditPermissionDenied(
  userId: string,
  resource: string,
  action: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.PERMISSION_DENIED,
    userId,
    targetType: 'resource',
    targetId: resource,
    ipAddress,
    userAgent,
    severity: AuditSeverity.WARNING,
    details: {
      attemptedAction: action,
    },
  });
}

export async function auditSecurityEvent(
  eventType: AuditEventType,
  userId: string,
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    eventType,
    userId,
    ipAddress,
    userAgent,
    severity: AuditSeverity.CRITICAL,
    details,
  });
}
