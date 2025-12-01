/**
 * Permission Resource Keys
 * Centralized constants for permission checking to avoid magic strings
 * 
 * Usage:
 * ```typescript
 * import { PERMISSIONS } from '@/constants/permissions';
 * 
 * const hasPermission = await checkUserPermission(userId, PERMISSIONS.PAGES.CLIENTS, 'READ');
 * ```
 */

/**
 * Page-level permissions
 */
export const PAGES = {
  DASHBOARD: 'dashboard',
  CLIENTS: 'clients',
  PROJECTS: 'projects',
  ANALYTICS: 'analytics',
  BD: 'bd',
  ADMIN: 'admin',
  ADMIN_USERS: 'admin.users',
  ADMIN_TEMPLATES: 'admin.templates',
  ADMIN_SERVICE_LINES: 'admin.service-lines',
  ADMIN_PERMISSIONS: 'admin.permissions',
} as const;

/**
 * Client feature permissions
 */
export const CLIENTS = {
  CREATE: 'clients.create',
  EDIT: 'clients.edit',
  DELETE: 'clients.delete',
  VIEW: 'clients.view',
  EXPORT: 'clients.export',
} as const;

/**
 * Project feature permissions
 */
export const PROJECTS = {
  CREATE: 'projects.create',
  EDIT: 'projects.edit',
  DELETE: 'projects.delete',
  ARCHIVE: 'projects.archive',
  ASSIGN_USERS: 'projects.assign-users',
  VIEW: 'projects.view',
  EXPORT: 'projects.export',
} as const;

/**
 * Document feature permissions
 */
export const DOCUMENTS = {
  UPLOAD: 'documents.upload',
  DOWNLOAD: 'documents.download',
  DELETE: 'documents.delete',
  VIEW: 'documents.view',
} as const;

/**
 * Client acceptance workflow permissions
 */
export const ACCEPTANCE = {
  CREATE: 'acceptance.create',
  APPROVE: 'acceptance.approve',
  VIEW: 'acceptance.view',
  EDIT: 'acceptance.edit',
} as const;

/**
 * Mapping feature permissions
 */
export const MAPPING = {
  CREATE: 'mapping.create',
  EDIT: 'mapping.edit',
  DELETE: 'mapping.delete',
  VIEW: 'mapping.view',
} as const;

/**
 * Tax adjustments feature permissions
 */
export const ADJUSTMENTS = {
  CREATE: 'adjustments.create',
  APPROVE: 'adjustments.approve',
  DELETE: 'adjustments.delete',
  VIEW: 'adjustments.view',
  EXTRACT: 'adjustments.extract',
} as const;

/**
 * Tax opinions feature permissions
 */
export const OPINIONS = {
  CREATE: 'opinions.create',
  EDIT: 'opinions.edit',
  GENERATE: 'opinions.generate',
  PUBLISH: 'opinions.publish',
  DELETE: 'opinions.delete',
  VIEW: 'opinions.view',
} as const;

/**
 * Reports feature permissions
 */
export const REPORTS = {
  GENERATE: 'reports.generate',
  EXPORT: 'reports.export',
  VIEW: 'reports.view',
} as const;

/**
 * Business development permissions
 */
export const BD = {
  OPPORTUNITIES_CREATE: 'bd.opportunities.create',
  OPPORTUNITIES_EDIT: 'bd.opportunities.edit',
  OPPORTUNITIES_DELETE: 'bd.opportunities.delete',
  OPPORTUNITIES_VIEW: 'bd.opportunities.view',
  CONTACTS_CREATE: 'bd.contacts.create',
  CONTACTS_EDIT: 'bd.contacts.edit',
  CONTACTS_DELETE: 'bd.contacts.delete',
  ACTIVITIES_CREATE: 'bd.activities.create',
  ACTIVITIES_EDIT: 'bd.activities.edit',
  ANALYTICS_VIEW: 'bd.analytics.view',
} as const;

/**
 * Analytics permissions
 */
export const ANALYTICS = {
  VIEW: 'analytics.view',
  EXPORT: 'analytics.export',
  CREDIT_RATING: 'analytics.credit-rating',
  FINANCIAL_RATIOS: 'analytics.financial-ratios',
} as const;

/**
 * Template management permissions
 */
export const TEMPLATES = {
  CREATE: 'templates.create',
  EDIT: 'templates.edit',
  DELETE: 'templates.delete',
  VIEW: 'templates.view',
} as const;

/**
 * User management permissions
 */
export const USERS = {
  CREATE: 'users.create',
  EDIT: 'users.edit',
  DELETE: 'users.delete',
  VIEW: 'users.view',
  ASSIGN_ROLES: 'users.assign-roles',
  ASSIGN_SERVICE_LINES: 'users.assign-service-lines',
} as const;

/**
 * Combined permissions object for easy import
 */
export const PERMISSIONS = {
  PAGES,
  CLIENTS,
  PROJECTS,
  DOCUMENTS,
  ACCEPTANCE,
  MAPPING,
  ADJUSTMENTS,
  OPINIONS,
  REPORTS,
  BD,
  ANALYTICS,
  TEMPLATES,
  USERS,
} as const;

/**
 * Type-safe permission keys
 */
export type PagePermission = typeof PAGES[keyof typeof PAGES];
export type ClientPermission = typeof CLIENTS[keyof typeof CLIENTS];
export type ProjectPermission = typeof PROJECTS[keyof typeof PROJECTS];
export type DocumentPermission = typeof DOCUMENTS[keyof typeof DOCUMENTS];
export type AcceptancePermission = typeof ACCEPTANCE[keyof typeof ACCEPTANCE];
export type MappingPermission = typeof MAPPING[keyof typeof MAPPING];
export type AdjustmentPermission = typeof ADJUSTMENTS[keyof typeof ADJUSTMENTS];
export type OpinionPermission = typeof OPINIONS[keyof typeof OPINIONS];
export type ReportPermission = typeof REPORTS[keyof typeof REPORTS];
export type BDPermission = typeof BD[keyof typeof BD];
export type AnalyticsPermission = typeof ANALYTICS[keyof typeof ANALYTICS];
export type TemplatePermission = typeof TEMPLATES[keyof typeof TEMPLATES];
export type UserPermission = typeof USERS[keyof typeof USERS];

/**
 * All permission keys type
 */
export type PermissionKey =
  | PagePermission
  | ClientPermission
  | ProjectPermission
  | DocumentPermission
  | AcceptancePermission
  | MappingPermission
  | AdjustmentPermission
  | OpinionPermission
  | ReportPermission
  | BDPermission
  | AnalyticsPermission
  | TemplatePermission
  | UserPermission;





