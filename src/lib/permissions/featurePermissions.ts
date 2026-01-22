/**
 * Feature Permissions Mapping
 * Maps roles to their allowed features
 */

import { Feature } from './features';
import { SystemRole, ServiceLineRole } from '@/types';

/**
 * Special wildcard for SYSTEM_ADMIN - grants all features
 */
const ALL_FEATURES = '*';

/**
 * Role-to-Features mapping for System Roles
 */
export const SYSTEM_ROLE_FEATURES: Record<SystemRole, Feature[] | typeof ALL_FEATURES> = {
  [SystemRole.SYSTEM_ADMIN]: ALL_FEATURES, // Full access to everything
  [SystemRole.USER]: [
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,
  ],
};

/**
 * Role-to-Features mapping for Service Line Roles
 */
export const SERVICE_LINE_ROLE_FEATURES: Record<ServiceLineRole, Feature[]> = {
  [ServiceLineRole.ADMINISTRATOR]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,
    Feature.ACCESS_ANALYTICS,
    Feature.ACCESS_BD,
    Feature.ACCESS_ADMIN,

    // Task Management
    Feature.MANAGE_TASKS,
    Feature.ASSIGN_TASK_TEAM,
    Feature.MANAGE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_LETTER,

    // Client Management
    Feature.MANAGE_CLIENTS,
    Feature.VIEW_CLIENT_ANALYTICS,
    Feature.EXPORT_CLIENT_DATA,

    // Documents
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,
    Feature.DELETE_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,
    Feature.DELETE_WORKSPACE_FILES,
    Feature.MANAGE_WORKSPACE_FOLDERS,

    // Business Development
    Feature.MANAGE_OPPORTUNITIES,
    Feature.MANAGE_CONTACTS,
    Feature.VIEW_BD_ANALYTICS,
    Feature.MANAGE_NEWS,

    // Admin
    Feature.MANAGE_USERS,
    Feature.MANAGE_SERVICE_LINES,
    Feature.MANAGE_TEMPLATES,
    Feature.MANAGE_EXTERNAL_LINKS,
    Feature.MANAGE_TOOLS,
    Feature.MANAGE_DATABASE,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,
    Feature.MANAGE_VAULT_DOCUMENTS,

    // Advanced
    Feature.USE_AI_TOOLS,
    Feature.EXPORT_REPORTS,
    Feature.VIEW_WIP_DATA,
  ],

  [ServiceLineRole.PARTNER]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,
    Feature.ACCESS_ANALYTICS,
    Feature.ACCESS_BD,

    // Task Management
    Feature.MANAGE_TASKS,
    Feature.ASSIGN_TASK_TEAM,
    Feature.MANAGE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_LETTER,

    // Client Management
    Feature.VIEW_CLIENT_ANALYTICS,
    Feature.EXPORT_CLIENT_DATA,

    // Documents
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,
    Feature.DELETE_WORKSPACE_FILES,
    Feature.MANAGE_WORKSPACE_FOLDERS,

    // Business Development
    Feature.MANAGE_OPPORTUNITIES,
    Feature.VIEW_BD_ANALYTICS,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,

    // Advanced
    Feature.USE_AI_TOOLS,
    Feature.EXPORT_REPORTS,
    Feature.VIEW_WIP_DATA,
  ],

  [ServiceLineRole.MANAGER]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,
    Feature.ACCESS_ANALYTICS,

    // Task Management
    Feature.MANAGE_TASKS,
    Feature.ASSIGN_TASK_TEAM,
    Feature.MANAGE_CLIENT_ACCEPTANCE,

    // Client Management
    Feature.VIEW_CLIENT_ANALYTICS,

    // Documents
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,
    Feature.MANAGE_WORKSPACE_FOLDERS,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,

    // Advanced
    Feature.USE_AI_TOOLS,
    Feature.EXPORT_REPORTS,
    Feature.VIEW_WIP_DATA,
  ],

  [ServiceLineRole.SUPERVISOR]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,

    // Task Management
    Feature.MANAGE_CLIENT_ACCEPTANCE,

    // Documents
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,

    // Advanced
    Feature.USE_AI_TOOLS,
    Feature.VIEW_WIP_DATA,
  ],

  [ServiceLineRole.USER]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,

    // Task Management
    Feature.MANAGE_CLIENT_ACCEPTANCE,

    // Documents
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,
  ],

  [ServiceLineRole.VIEWER]: [
    // Core Access
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,

    // Documents
    Feature.DOWNLOAD_DOCUMENTS,

    // Workspace
    Feature.ACCESS_WORKSPACE,

    // Document Vault
    Feature.ACCESS_DOCUMENT_VAULT,
  ],
};

/**
 * Task role features (for task-level permissions)
 */
export const TASK_ROLE_FEATURES: Record<string, Feature[]> = {
  ADMIN: [
    Feature.MANAGE_TASKS,
    Feature.ASSIGN_TASK_TEAM,
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,
    Feature.DELETE_DOCUMENTS,
    Feature.USE_AI_TOOLS,
  ],
  REVIEWER: [
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,
    Feature.USE_AI_TOOLS,
  ],
  EDITOR: [
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,
    Feature.USE_AI_TOOLS,
  ],
  VIEWER: [
    Feature.DOWNLOAD_DOCUMENTS,
  ],
};

/**
 * Check if a role has a specific feature
 * @param role - The role to check (system or service line)
 * @param feature - The feature to check for
 * @returns true if the role has the feature
 */
export function roleHasFeature(
  role: SystemRole | ServiceLineRole,
  feature: Feature
): boolean {
  // Check system roles first
  if (role === SystemRole.SYSTEM_ADMIN) {
    return true; // SYSTEM_ADMIN has all features
  }

  if (role === SystemRole.USER) {
    const features = SYSTEM_ROLE_FEATURES[SystemRole.USER];
    return Array.isArray(features) && features.includes(feature);
  }

  // Check service line roles
  const serviceLineRole = role as ServiceLineRole;
  const features = SERVICE_LINE_ROLE_FEATURES[serviceLineRole];
  
  if (!features) {
    return false;
  }

  return features.includes(feature);
}

/**
 * Get all features for a role
 * @param role - The role to get features for
 * @returns Array of features the role has access to
 */
export function getRoleFeatures(role: SystemRole | ServiceLineRole): Feature[] {
  // System admin has all features
  if (role === SystemRole.SYSTEM_ADMIN) {
    return Object.values(Feature);
  }

  // System user
  if (role === SystemRole.USER) {
    const features = SYSTEM_ROLE_FEATURES[SystemRole.USER];
    return Array.isArray(features) ? features : [];
  }

  // Service line roles
  const serviceLineRole = role as ServiceLineRole;
  return SERVICE_LINE_ROLE_FEATURES[serviceLineRole] || [];
}

/**
 * Check if a task role has a specific feature
 * @param taskRole - The task role
 * @param feature - The feature to check for
 * @returns true if the task role has the feature
 */
export function taskRoleHasFeature(
  taskRole: keyof typeof TASK_ROLE_FEATURES,
  feature: Feature
): boolean {
  const features = TASK_ROLE_FEATURES[taskRole];
  return features ? features.includes(feature) : false;
}

