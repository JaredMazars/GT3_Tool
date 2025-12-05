import { ROUTES } from '@/constants/routes';
import { formatRole } from '@/lib/utils/projectUtils';

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
 */
export function createUserAddedNotification(
  projectName: string,
  projectId: number,
  addedByName: string,
  role: string
): NotificationTemplate {
  return {
    title: `Added to ${projectName}`,
    message: `${addedByName} added you to the project as ${formatRole(role)}.`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}`,
  };
}

/**
 * Create user removed from project notification
 */
export function createUserRemovedNotification(
  projectName: string,
  projectId: number,
  removedByName: string
): NotificationTemplate {
  return {
    title: `Removed from ${projectName}`,
    message: `${removedByName} removed you from the project.`,
    actionUrl: ROUTES.DASHBOARD.ROOT,
  };
}

/**
 * Create user role changed notification
 */
export function createUserRoleChangedNotification(
  projectName: string,
  projectId: number,
  changedByName: string,
  oldRole: string,
  newRole: string
): NotificationTemplate {
  return {
    title: `Role Changed in ${projectName}`,
    message: `${changedByName} changed your role from ${formatRole(oldRole)} to ${formatRole(newRole)}.`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}`,
  };
}

/**
 * Create document processed notification
 */
export function createDocumentProcessedNotification(
  projectName: string,
  projectId: number,
  documentName: string
): NotificationTemplate {
  return {
    title: `Document Processed in ${projectName}`,
    message: `"${documentName}" has been successfully processed.`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}/document-management`,
  };
}

/**
 * Create opinion draft ready notification
 */
export function createOpinionDraftReadyNotification(
  projectName: string,
  projectId: number,
  draftId: number
): NotificationTemplate {
  return {
    title: `Opinion Draft Ready in ${projectName}`,
    message: `A new opinion draft is ready for review.`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}/opinion-drafting`,
  };
}

/**
 * Create tax calculation complete notification
 */
export function createTaxCalculationCompleteNotification(
  projectName: string,
  projectId: number
): NotificationTemplate {
  return {
    title: `Tax Calculation Complete in ${projectName}`,
    message: `Tax calculations have been completed and are ready for review.`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}/tax-calculation`,
  };
}

/**
 * Create filing status updated notification
 */
export function createFilingStatusUpdatedNotification(
  projectName: string,
  projectId: number,
  newStatus: string
): NotificationTemplate {
  return {
    title: `Filing Status Updated in ${projectName}`,
    message: `Filing status has been updated to: ${newStatus}`,
    actionUrl: `${ROUTES.DASHBOARD.PROJECTS}/${projectId}/filing-status`,
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



