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
 */
export function createUserAddedNotification(
  taskName: string,
  taskId: number,
  addedByName: string,
  role: string,
  serviceLine?: string,
  subServiceLineGroup?: string,
  clientId?: number
): NotificationTemplate {
  return {
    title: `Added to ${taskName}`,
    message: `${addedByName} added you to the task as ${formatRole(role)}.`,
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



