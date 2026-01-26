import { ROUTES } from '@/constants/routes';
import { formatRole } from '@/lib/utils/taskUtils';
import { buildTaskUrl } from '@/lib/utils/taskUrlBuilder';

/**
 * Notification template result
 */
interface NotificationTemplate {
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Create user added to project notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param addedByName - Name of user who added this user
 * @param role - Task role assigned
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 * @param clientName - Client name (if client task, for independence message)
 */
export function createUserAddedNotification(
  taskName: string,
  taskId: number,
  addedByName: string,
  role: string,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number,
  clientName?: string
): NotificationTemplate {
  let message = `${addedByName} added you to the task as ${formatRole(role)}.`;
  
  // Add independence message for client tasks
  if (clientName) {
    message += ` Please confirm your independence from ${clientName} before starting work. Go to My Approvals to complete.`;
  }
  
  return {
    title: `Added to ${taskName}`,
    message,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId }),
  };
}

/**
 * Create user removed from task notification
 */
export function createUserRemovedNotification(
  taskName: string,
  taskId: number,
  removedByName: string
): NotificationTemplate {
  return {
    title: `Removed from ${taskName}`,
    message: `${removedByName} removed you from the task.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create user role changed notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param changedByName - Name of user who changed the role
 * @param oldRole - Previous role
 * @param newRole - New role
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 */
export function createUserRoleChangedNotification(
  taskName: string,
  taskId: number,
  changedByName: string,
  oldRole: string,
  newRole: string,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Role Changed in ${taskName}`,
    message: `${changedByName} changed your role from ${formatRole(oldRole)} to ${formatRole(newRole)}.`,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId }),
  };
}

/**
 * Create document processed notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param documentName - Name of processed document
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 */
export function createDocumentProcessedNotification(
  taskName: string,
  taskId: number,
  documentName: string,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Document Processed in ${taskName}`,
    message: `"${documentName}" has been successfully processed.`,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId, tab: 'document-management' }),
  };
}

/**
 * Create opinion draft ready notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param draftId - Draft ID
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 */
export function createOpinionDraftReadyNotification(
  taskName: string,
  taskId: number,
  draftId: number,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Opinion Draft Ready in ${taskName}`,
    message: `A new opinion draft is ready for review.`,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId, tab: 'tax-opinion' }),
  };
}

/**
 * Create tax calculation complete notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 */
export function createTaxCalculationCompleteNotification(
  taskName: string,
  taskId: number,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Tax Calculation Complete in ${taskName}`,
    message: `Tax calculations have been completed and are ready for review.`,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId, tab: 'tax-calculation' }),
  };
}

/**
 * Create filing status updated notification
 * @param taskName - Task name to display
 * @param taskId - Internal task ID
 * @param newStatus - New filing status
 * @param serviceLine - Service line code (e.g., 'TAX', 'AUDIT')
 * @param subServiceLineGroup - Sub-service line group code
 * @param clientId - Internal client ID
 */
export function createFilingStatusUpdatedNotification(
  taskName: string,
  taskId: number,
  newStatus: string,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Filing Status Updated in ${taskName}`,
    message: `Filing status has been updated to: ${newStatus}`,
    actionUrl: buildTaskUrl({ taskId, serviceLine, subServiceLineGroup, clientId, tab: 'filing-status' }),
  };
}

/**
 * Create user message notification (user-to-user)
 */
export function createUserMessageNotification(
  senderName: string,
  title: string,
  message: string,
  actionUrl?: string
): NotificationTemplate {
  return {
    title: `${senderName}: ${title}`,
    message,
    actionUrl,
  };
}

/**
 * Create service line added notification
 */
export function createServiceLineAddedNotification(
  serviceLine: string,
  addedByName: string,
  role: string
): NotificationTemplate {
  return {
    title: `Added to ${serviceLine} Service Line`,
    message: `${addedByName} granted you access to the ${serviceLine} service line as ${formatRole(role)}.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create service line removed notification
 */
export function createServiceLineRemovedNotification(
  serviceLine: string,
  removedByName: string
): NotificationTemplate {
  return {
    title: `Removed from ${serviceLine} Service Line`,
    message: `${removedByName} revoked your access to the ${serviceLine} service line.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create service line role changed notification
 */
export function createServiceLineRoleChangedNotification(
  serviceLine: string,
  changedByName: string,
  oldRole: string,
  newRole: string
): NotificationTemplate {
  return {
    title: `Role Changed in ${serviceLine} Service Line`,
    message: `${changedByName} changed your role from ${formatRole(oldRole)} to ${formatRole(newRole)}.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create system role changed notification
 */
export function createSystemRoleChangedNotification(
  changedByName: string,
  oldRole: string,
  newRole: string
): NotificationTemplate {
  return {
    title: 'System Role Changed',
    message: `${changedByName} changed your system role from ${formatRole(oldRole)} to ${formatRole(newRole)}.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create client partner/manager change request notification (to proposed person)
 * This is sent to the person being proposed as the new partner/manager
 */
export function createPartnerManagerChangeRequestNotification(
  changeType: 'PARTNER' | 'MANAGER',
  clientName: string,
  clientCode: string,
  requestedByName: string,
  reason: string | null,
  requestId: number
): NotificationTemplate {
  const roleLabel = changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
  return {
    title: `${roleLabel} Change Request`,
    message: `${requestedByName} has requested to assign you as ${roleLabel} for ${clientName} (${clientCode}).${reason ? ` Reason: ${reason}` : ''}`,
    actionUrl: `/change-requests/${requestId}`,
  };
}

/**
 * Create client partner/manager change info notification (to current person)
 * This is sent to the current partner/manager for informational purposes
 */
export function createPartnerManagerChangeInfoNotification(
  changeType: 'PARTNER' | 'MANAGER',
  clientName: string,
  clientCode: string,
  requestedByName: string,
  proposedEmployeeName: string
): NotificationTemplate {
  const roleLabel = changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
  return {
    title: `${roleLabel} Change Requested`,
    message: `${requestedByName} has requested to change the ${roleLabel} for ${clientName} (${clientCode}) from you to ${proposedEmployeeName}.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create change request approved notification (to requester)
 */
export function createChangeRequestApprovedNotification(
  changeType: 'PARTNER' | 'MANAGER',
  clientName: string,
  clientCode: string,
  approvedByName: string,
  clientId: string,
  serviceLine?: string,
  subServiceLineGroup?: string
): NotificationTemplate {
  const roleLabel = changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
  const clientUrl = serviceLine && subServiceLineGroup 
    ? `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${clientId}`
    : ROUTES.DASHBOARD.ROOT;
    
  return {
    title: `${roleLabel} Change Approved`,
    message: `${approvedByName} approved your request to change the ${roleLabel} for ${clientName} (${clientCode}). The client record has been updated.`,
    actionUrl: clientUrl,
  };
}

/**
 * Create change request rejected notification (to requester)
 */
export function createChangeRequestRejectedNotification(
  changeType: 'PARTNER' | 'MANAGER',
  clientName: string,
  clientCode: string,
  rejectedByName: string,
  comment: string | null
): NotificationTemplate {
  const roleLabel = changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
  return {
    title: `${roleLabel} Change Rejected`,
    message: `${rejectedByName} declined your request to change the ${roleLabel} for ${clientName} (${clientCode}).${comment ? ` Comment: ${comment}` : ''}`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create approval assigned notification
 */
export function createApprovalAssignedNotification(
  workflowTitle: string,
  workflowType: string,
  requestedByName: string,
  approvalId: number
): NotificationTemplate {
  return {
    title: 'Approval Required',
    message: `${requestedByName} submitted "${workflowTitle}" for your approval.`,
    actionUrl: '/dashboard/approvals',
  };
}

