/**
 * Feature Flags for Permission System
 * Simple, readable feature names instead of CRUD operations
 */

/**
 * All available features in the system
 */
export enum Feature {
  // Core Access
  ACCESS_DASHBOARD = 'access_dashboard',
  ACCESS_CLIENTS = 'access_clients',
  ACCESS_TASKS = 'access_tasks',
  ACCESS_ANALYTICS = 'access_analytics',
  ACCESS_BD = 'access_bd',
  ACCESS_ADMIN = 'access_admin',

  // Task Management
  MANAGE_TASKS = 'manage_tasks',
  ASSIGN_TASK_TEAM = 'assign_task_team',
  MANAGE_CLIENT_ACCEPTANCE = 'manage_client_acceptance',
  APPROVE_CLIENT_ACCEPTANCE = 'approve_client_acceptance',
  APPROVE_ACCEPTANCE = 'approve_acceptance', // Renamed to APPROVE_ENGAGEMENT_ACCEPTANCE (kept for backwards compatibility)
  APPROVE_ENGAGEMENT_ACCEPTANCE = 'approve_engagement_acceptance',
  APPROVE_ENGAGEMENT_LETTER = 'approve_engagement_letter',

  // Client Management
  MANAGE_CLIENTS = 'manage_clients',
  VIEW_CLIENT_ANALYTICS = 'view_client_analytics',
  EXPORT_CLIENT_DATA = 'export_client_data',

  // Documents
  UPLOAD_DOCUMENTS = 'upload_documents',
  DOWNLOAD_DOCUMENTS = 'download_documents',
  DELETE_DOCUMENTS = 'delete_documents',

  // Workspace
  ACCESS_WORKSPACE = 'access_workspace',
  MANAGE_WORKSPACE_FILES = 'manage_workspace_files',
  DELETE_WORKSPACE_FILES = 'delete_workspace_files',
  MANAGE_WORKSPACE_FOLDERS = 'manage_workspace_folders',

  // Business Development
  MANAGE_OPPORTUNITIES = 'manage_opportunities',
  MANAGE_CONTACTS = 'manage_contacts',
  VIEW_BD_ANALYTICS = 'view_bd_analytics',
  MANAGE_NEWS = 'manage_news',

  // Admin
  MANAGE_USERS = 'manage_users',
  MANAGE_SERVICE_LINES = 'manage_service_lines',
  MANAGE_TEMPLATES = 'manage_templates',
  MANAGE_EXTERNAL_LINKS = 'manage_external_links',
  MANAGE_TOOLS = 'manage_tools',
  ACCESS_BUG_REPORTS = 'access_bug_reports',
  MANAGE_DATABASE = 'manage_database',

  // Document Vault
  ACCESS_DOCUMENT_VAULT = 'access_document_vault',
  MANAGE_VAULT_DOCUMENTS = 'manage_vault_documents',

  // QRM (Quality & Risk Management)
  ACCESS_QRM = 'access_qrm',
  VIEW_QRM_MONITORING = 'view_qrm_monitoring',

  // Advanced
  USE_AI_TOOLS = 'use_ai_tools',
  EXPORT_REPORTS = 'export_reports',
  VIEW_WIP_DATA = 'view_wip_data',
}

/**
 * Feature type for type safety
 */
export type FeatureFlag = Feature | string;

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  CORE_ACCESS: [
    Feature.ACCESS_DASHBOARD,
    Feature.ACCESS_CLIENTS,
    Feature.ACCESS_TASKS,
    Feature.ACCESS_ANALYTICS,
    Feature.ACCESS_BD,
    Feature.ACCESS_ADMIN,
  ],
  TASK_MANAGEMENT: [
    Feature.MANAGE_TASKS,
    Feature.ASSIGN_TASK_TEAM,
    Feature.MANAGE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_CLIENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_ACCEPTANCE,
    Feature.APPROVE_ENGAGEMENT_LETTER,
  ],
  CLIENT_MANAGEMENT: [
    Feature.MANAGE_CLIENTS,
    Feature.VIEW_CLIENT_ANALYTICS,
    Feature.EXPORT_CLIENT_DATA,
  ],
  DOCUMENTS: [
    Feature.UPLOAD_DOCUMENTS,
    Feature.DOWNLOAD_DOCUMENTS,
    Feature.DELETE_DOCUMENTS,
  ],
  WORKSPACE: [
    Feature.ACCESS_WORKSPACE,
    Feature.MANAGE_WORKSPACE_FILES,
    Feature.DELETE_WORKSPACE_FILES,
    Feature.MANAGE_WORKSPACE_FOLDERS,
  ],
  BUSINESS_DEVELOPMENT: [
    Feature.MANAGE_OPPORTUNITIES,
    Feature.MANAGE_CONTACTS,
    Feature.VIEW_BD_ANALYTICS,
    Feature.MANAGE_NEWS,
  ],
  ADMIN: [
    Feature.MANAGE_USERS,
    Feature.MANAGE_SERVICE_LINES,
    Feature.MANAGE_TEMPLATES,
    Feature.MANAGE_EXTERNAL_LINKS,
    Feature.MANAGE_TOOLS,
    Feature.ACCESS_BUG_REPORTS,
    Feature.MANAGE_DATABASE,
  ],
  DOCUMENT_VAULT: [
    Feature.ACCESS_DOCUMENT_VAULT,
    Feature.MANAGE_VAULT_DOCUMENTS,
  ],
  QRM: [
    Feature.ACCESS_QRM,
    Feature.VIEW_QRM_MONITORING,
  ],
  ADVANCED: [
    Feature.USE_AI_TOOLS,
    Feature.EXPORT_REPORTS,
    Feature.VIEW_WIP_DATA,
  ],
} as const;

/**
 * Human-readable feature descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  [Feature.ACCESS_DASHBOARD]: 'Access the main dashboard',
  [Feature.ACCESS_CLIENTS]: 'View clients page',
  [Feature.ACCESS_TASKS]: 'View tasks page',
  [Feature.ACCESS_ANALYTICS]: 'Access analytics features',
  [Feature.ACCESS_BD]: 'Access business development features',
  [Feature.ACCESS_ADMIN]: 'Access admin panel',

  [Feature.MANAGE_TASKS]: 'Create, edit, and manage tasks',
  [Feature.ASSIGN_TASK_TEAM]: 'Assign team members to tasks',
  [Feature.MANAGE_CLIENT_ACCEPTANCE]: 'Complete and manage client acceptance assessments',
  [Feature.APPROVE_CLIENT_ACCEPTANCE]: 'Approve client risk assessments (Partner only)',
  [Feature.APPROVE_ACCEPTANCE]: 'Approve engagement acceptance questionnaires (legacy)',
  [Feature.APPROVE_ENGAGEMENT_ACCEPTANCE]: 'Approve engagement acceptance questionnaires',
  [Feature.APPROVE_ENGAGEMENT_LETTER]: 'Approve engagement letters',

  [Feature.MANAGE_CLIENTS]: 'Create and edit client information',
  [Feature.VIEW_CLIENT_ANALYTICS]: 'View client analytics and credit ratings',
  [Feature.EXPORT_CLIENT_DATA]: 'Export client data and reports',

  [Feature.UPLOAD_DOCUMENTS]: 'Upload documents to tasks and clients',
  [Feature.DOWNLOAD_DOCUMENTS]: 'Download documents',
  [Feature.DELETE_DOCUMENTS]: 'Delete documents',

  [Feature.ACCESS_WORKSPACE]: 'Access the collaborative workspace',
  [Feature.MANAGE_WORKSPACE_FILES]: 'Upload and edit workspace files',
  [Feature.DELETE_WORKSPACE_FILES]: 'Delete workspace files',
  [Feature.MANAGE_WORKSPACE_FOLDERS]: 'Create and manage workspace folders',

  [Feature.MANAGE_OPPORTUNITIES]: 'Create and manage BD opportunities',
  [Feature.MANAGE_CONTACTS]: 'Create and manage BD contacts',
  [Feature.VIEW_BD_ANALYTICS]: 'View business development analytics',
  [Feature.MANAGE_NEWS]: 'Create and manage company news bulletins',

  [Feature.MANAGE_USERS]: 'Create and manage user accounts',
  [Feature.MANAGE_SERVICE_LINES]: 'Manage service line configurations',
  [Feature.MANAGE_TEMPLATES]: 'Create and edit templates',
  [Feature.MANAGE_EXTERNAL_LINKS]: 'Manage external software links',
  [Feature.MANAGE_TOOLS]: 'Create and manage tools and their assignments',
  [Feature.ACCESS_BUG_REPORTS]: 'View and manage user-reported bugs',
  [Feature.MANAGE_DATABASE]: 'Manage database operations and maintenance',

  [Feature.ACCESS_DOCUMENT_VAULT]: 'Access the document vault',
  [Feature.MANAGE_VAULT_DOCUMENTS]: 'Upload, archive, and manage vault documents',

  [Feature.ACCESS_QRM]: 'Access QRM (Quality & Risk Management) features',
  [Feature.VIEW_QRM_MONITORING]: 'View QRM monitoring dashboards and statistics',

  [Feature.USE_AI_TOOLS]: 'Use AI-powered tools and features',
  [Feature.EXPORT_REPORTS]: 'Export reports and data',
  [Feature.VIEW_WIP_DATA]: 'View work-in-progress financial data',
};


