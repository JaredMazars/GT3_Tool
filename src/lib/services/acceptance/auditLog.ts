/**
 * Audit logging for acceptance and continuance module
 * Tracks all sensitive operations for compliance and security
 * 
 * This module provides domain-specific convenience functions for acceptance
 * workflows, but uses the centralized audit logging system internally.
 */

import { logger } from '@/lib/utils/logger';
import { 
  logAuditEvent, 
  AuditEventType as GeneralAuditEventType,
  AuditSeverity 
} from '@/lib/utils/auditLog';

export type AcceptanceAuditAction =
  | 'INITIALIZED'
  | 'ANSWERED'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DELETED';

export interface AcceptanceAuditMetadata {
  questionnaireType?: string;
  riskRating?: string;
  riskScore?: number;
  documentId?: number;
  fileName?: string;
  documentType?: string;
  answerCount?: number;
  [key: string]: any;
}

/**
 * Log an acceptance/continuance audit event
 * Uses the centralized audit logging system with acceptance-specific context
 */
export async function logAcceptanceEvent(
  taskId: number,
  userId: string,
  action: AcceptanceAuditAction,
  metadata?: AcceptanceAuditMetadata
): Promise<void> {
  // Use centralized audit logging system
  await logAuditEvent({
    eventType: 'ACCEPTANCE' as any, // Custom event type for acceptance module
    userId,
    targetType: 'task',
    targetId: String(taskId),
    severity: AuditSeverity.INFO,
    details: {
      module: 'ACCEPTANCE',
      action,
      ...metadata,
    },
  });
}

/**
 * Log questionnaire initialization
 */
export async function logQuestionnaireInitialized(
  taskId: number,
  userId: string,
  questionnaireType: string
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'INITIALIZED', {
    questionnaireType,
  });
}

/**
 * Log answers being saved
 */
export async function logAnswersSaved(
  taskId: number,
  userId: string,
  answerCount: number
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'ANSWERED', {
    answerCount,
  });
}

/**
 * Log questionnaire submission
 */
export async function logQuestionnaireSubmitted(
  taskId: number,
  userId: string,
  questionnaireType: string,
  riskRating?: string,
  riskScore?: number
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'SUBMITTED', {
    questionnaireType,
    riskRating,
    riskScore,
  });
}

/**
 * Log questionnaire review
 */
export async function logQuestionnaireReviewed(
  taskId: number,
  userId: string,
  questionnaireType: string,
  riskRating?: string
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'REVIEWED', {
    questionnaireType,
    riskRating,
  });
}

/**
 * Log acceptance approval
 */
export async function logAcceptanceApproved(
  taskId: number,
  userId: string,
  questionnaireType: string,
  riskRating?: string,
  riskScore?: number
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'APPROVED', {
    questionnaireType,
    riskRating,
    riskScore,
  });
}

/**
 * Log document upload
 */
export async function logDocumentUploaded(
  taskId: number,
  userId: string,
  documentId: number,
  fileName: string,
  documentType: string
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'DOCUMENT_UPLOADED', {
    documentId,
    fileName,
    documentType,
  });
}

/**
 * Log document viewing
 */
export async function logDocumentViewed(
  taskId: number,
  userId: string,
  documentId: number,
  fileName: string
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'DOCUMENT_VIEWED', {
    documentId,
    fileName,
  });
}

/**
 * Log document deletion
 */
export async function logDocumentDeleted(
  taskId: number,
  userId: string,
  documentId: number,
  fileName: string
): Promise<void> {
  await logAcceptanceEvent(taskId, userId, 'DOCUMENT_DELETED', {
    documentId,
    fileName,
  });
}





















