import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
type ResourceType = 'PAGE' | 'FEATURE';
// System roles - only SYSTEM_ADMIN and USER allowed at system level
type SystemRole = 'SYSTEM_ADMIN' | 'USER';
// Service line roles - used in ServiceLineUser table
type ServiceLineRole = 'ADMINISTRATOR' | 'PARTNER' | 'MANAGER' | 'SUPERVISOR' | 'USER' | 'VIEWER';
// Combined role type for permission matrix (includes both system and service line roles)
type UserRole = SystemRole | ServiceLineRole;

interface PermissionDefinition {
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  description: string;
  availableActions: PermissionAction[];
}

interface RolePermissionDefinition {
  role: UserRole;
  resourceKey: string;
  allowedActions: PermissionAction[];
}

// Define all permissions
const permissions: PermissionDefinition[] = [
  // PAGE PERMISSIONS
  {
    resourceType: 'PAGE',
    resourceKey: 'dashboard',
    displayName: 'Dashboard',
    description: 'Access to main dashboard page',
    availableActions: ['READ'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'clients',
    displayName: 'Clients',
    description: 'Access to clients page and client list',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'projects',
    displayName: 'Projects',
    description: 'Access to projects page and project list',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'analytics',
    displayName: 'Analytics',
    description: 'Access to analytics and reporting',
    availableActions: ['READ'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'bd',
    displayName: 'Business Development',
    description: 'Access to BD/CRM pages',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'notifications',
    displayName: 'Notifications',
    description: 'Access to notifications page',
    availableActions: ['READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin',
    displayName: 'Admin',
    description: 'Access to admin pages',
    availableActions: ['READ'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin.users',
    displayName: 'Admin - Users',
    description: 'Manage users in admin panel',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin.templates',
    displayName: 'Admin - Templates',
    description: 'Manage templates in admin panel',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin.service-lines',
    displayName: 'Admin - Service Lines',
    description: 'Manage service line access',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin.permissions',
    displayName: 'Admin - Permissions',
    description: 'Manage role permissions matrix',
    availableActions: ['READ', 'UPDATE'],
  },
  {
    resourceType: 'PAGE',
    resourceKey: 'admin.service-line-mapping',
    displayName: 'Admin - Service Line Mapping',
    description: 'Map external service lines to master service lines',
    availableActions: ['READ', 'UPDATE'],
  },

  // FEATURE PERMISSIONS - Clients
  {
    resourceType: 'FEATURE',
    resourceKey: 'clients.create',
    displayName: 'Create Client',
    description: 'Create new clients',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'clients.edit',
    displayName: 'Edit Client',
    description: 'Edit existing client information',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'clients.delete',
    displayName: 'Delete Client',
    description: 'Delete clients from the system',
    availableActions: ['DELETE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'clients.view',
    displayName: 'View Client',
    description: 'View client details',
    availableActions: ['READ'],
  },

  // FEATURE PERMISSIONS - Projects
  {
    resourceType: 'FEATURE',
    resourceKey: 'projects.create',
    displayName: 'Create Project',
    description: 'Create new projects',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'projects.edit',
    displayName: 'Edit Project',
    description: 'Edit project information',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'projects.delete',
    displayName: 'Delete Project',
    description: 'Delete projects',
    availableActions: ['DELETE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'projects.archive',
    displayName: 'Archive Project',
    description: 'Archive/unarchive projects',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'projects.assign-users',
    displayName: 'Assign Project Users',
    description: 'Assign users to projects',
    availableActions: ['CREATE', 'UPDATE', 'DELETE'],
  },

  // FEATURE PERMISSIONS - Documents
  {
    resourceType: 'FEATURE',
    resourceKey: 'documents.upload',
    displayName: 'Upload Documents',
    description: 'Upload documents to projects',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'documents.download',
    displayName: 'Download Documents',
    description: 'Download documents from projects',
    availableActions: ['READ'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'documents.delete',
    displayName: 'Delete Documents',
    description: 'Delete documents from projects',
    availableActions: ['DELETE'],
  },

  // FEATURE PERMISSIONS - Acceptance
  {
    resourceType: 'FEATURE',
    resourceKey: 'acceptance.create',
    displayName: 'Create Acceptance',
    description: 'Create client acceptance questionnaires',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'acceptance.approve',
    displayName: 'Approve Acceptance',
    description: 'Approve client acceptance',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'acceptance.view',
    displayName: 'View Acceptance',
    description: 'View acceptance questionnaires',
    availableActions: ['READ'],
  },

  // FEATURE PERMISSIONS - Mapping
  {
    resourceType: 'FEATURE',
    resourceKey: 'mapping.create',
    displayName: 'Create Mappings',
    description: 'Create account mappings',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'mapping.edit',
    displayName: 'Edit Mappings',
    description: 'Edit account mappings',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'mapping.delete',
    displayName: 'Delete Mappings',
    description: 'Delete account mappings',
    availableActions: ['DELETE'],
  },

  // FEATURE PERMISSIONS - Tax Adjustments
  {
    resourceType: 'FEATURE',
    resourceKey: 'adjustments.create',
    displayName: 'Create Adjustments',
    description: 'Create tax adjustments',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'adjustments.approve',
    displayName: 'Approve Adjustments',
    description: 'Approve or reject tax adjustments',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'adjustments.delete',
    displayName: 'Delete Adjustments',
    description: 'Delete tax adjustments',
    availableActions: ['DELETE'],
  },

  // FEATURE PERMISSIONS - Opinions
  {
    resourceType: 'FEATURE',
    resourceKey: 'opinions.create',
    displayName: 'Create Opinions',
    description: 'Create tax opinion drafts',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'opinions.edit',
    displayName: 'Edit Opinions',
    description: 'Edit tax opinion drafts',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'opinions.generate',
    displayName: 'AI Generate Opinions',
    description: 'Use AI to generate opinion sections',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'opinions.publish',
    displayName: 'Publish Opinions',
    description: 'Publish final tax opinions',
    availableActions: ['UPDATE'],
  },

  // FEATURE PERMISSIONS - Reports
  {
    resourceType: 'FEATURE',
    resourceKey: 'reports.generate',
    displayName: 'Generate Reports',
    description: 'Generate project reports',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'reports.export',
    displayName: 'Export Reports',
    description: 'Export reports to PDF/Excel',
    availableActions: ['READ'],
  },

  // FEATURE PERMISSIONS - BD/CRM
  {
    resourceType: 'FEATURE',
    resourceKey: 'bd.opportunities.create',
    displayName: 'Create Opportunities',
    description: 'Create BD opportunities',
    availableActions: ['CREATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'bd.opportunities.edit',
    displayName: 'Edit Opportunities',
    description: 'Edit BD opportunities',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'bd.opportunities.delete',
    displayName: 'Delete Opportunities',
    description: 'Delete BD opportunities',
    availableActions: ['DELETE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'bd.contacts.manage',
    displayName: 'Manage Contacts',
    description: 'Manage BD contacts',
    availableActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  },

  // FEATURE PERMISSIONS - Project-Level Features (from authorization.ts Feature enum)
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.approve-acceptance',
    displayName: 'Approve Client Acceptance',
    description: 'Approve client acceptance questionnaires (Partner/Admin only)',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.approve-engagement-letter',
    displayName: 'Approve Engagement Letter',
    description: 'Approve engagement letters (Partner/Admin only)',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.manage',
    displayName: 'Manage Project',
    description: 'Manage project settings and configuration',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.delete',
    displayName: 'Delete Project',
    description: 'Delete projects from the system',
    availableActions: ['DELETE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.assign-team',
    displayName: 'Assign Team Members',
    description: 'Assign users to projects',
    availableActions: ['CREATE', 'UPDATE', 'DELETE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.edit-data',
    displayName: 'Edit Project Data',
    description: 'Edit project data and details',
    availableActions: ['UPDATE'],
  },
  {
    resourceType: 'FEATURE',
    resourceKey: 'project.view',
    displayName: 'View Project',
    description: 'View project details and data',
    availableActions: ['READ'],
  },
];

// Define default role permissions
const rolePermissions: RolePermissionDefinition[] = [
  // VIEWER - READ only on most pages
  { role: 'VIEWER', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'clients', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'projects', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE'] },
  { role: 'VIEWER', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'VIEWER', resourceKey: 'project.view', allowedActions: ['READ'] },

  // USER - READ on all, CREATE/UPDATE on assigned projects
  { role: 'USER', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'clients', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'projects', allowedActions: ['READ', 'UPDATE'] },
  { role: 'USER', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'bd', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'USER', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'USER', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'USER', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'USER', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'USER', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'USER', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'USER', resourceKey: 'project.view', allowedActions: ['READ'] },

  // SUPERVISOR - READ/UPDATE on service line projects, CREATE projects
  { role: 'SUPERVISOR', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'clients', allowedActions: ['READ', 'UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'projects', allowedActions: ['CREATE', 'READ', 'UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'bd', allowedActions: ['READ', 'UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'clients.edit', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'projects.create', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'projects.archive', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'projects.assign-users', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'documents.delete', allowedActions: ['DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'acceptance.approve', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'mapping.delete', allowedActions: ['DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'adjustments.approve', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'adjustments.delete', allowedActions: ['DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'opinions.generate', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'SUPERVISOR', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'SUPERVISOR', resourceKey: 'bd.opportunities.edit', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'project.assign-team', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'SUPERVISOR', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'SUPERVISOR', resourceKey: 'project.view', allowedActions: ['READ'] },

  // MANAGER - Full CRUD on service line, READ on other areas
  { role: 'MANAGER', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'clients', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'projects', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'bd', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'clients.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'clients.edit', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'clients.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'projects.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'projects.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'projects.archive', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'projects.assign-users', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'documents.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'acceptance.approve', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'mapping.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'adjustments.approve', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'adjustments.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'opinions.generate', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'opinions.publish', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'MANAGER', resourceKey: 'bd.opportunities.create', allowedActions: ['CREATE'] },
  { role: 'MANAGER', resourceKey: 'bd.opportunities.edit', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'bd.opportunities.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'bd.contacts.manage', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'project.manage', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'project.delete', allowedActions: ['DELETE'] },
  { role: 'MANAGER', resourceKey: 'project.assign-team', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'MANAGER', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'MANAGER', resourceKey: 'project.view', allowedActions: ['READ'] },

  // PARTNER - Full CRUD across service lines, limited admin access
  { role: 'PARTNER', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'clients', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'projects', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'bd', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'admin', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'admin.templates', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'clients.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'clients.edit', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'clients.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'projects.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'projects.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'projects.archive', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'projects.assign-users', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'documents.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'acceptance.approve', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'mapping.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'adjustments.approve', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'adjustments.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'opinions.generate', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'opinions.publish', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'PARTNER', resourceKey: 'bd.opportunities.create', allowedActions: ['CREATE'] },
  { role: 'PARTNER', resourceKey: 'bd.opportunities.edit', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'bd.opportunities.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'bd.contacts.manage', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'project.approve-acceptance', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'project.approve-engagement-letter', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'project.manage', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'project.delete', allowedActions: ['DELETE'] },
  { role: 'PARTNER', resourceKey: 'project.assign-team', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'PARTNER', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'PARTNER', resourceKey: 'project.view', allowedActions: ['READ'] },

  // ADMINISTRATOR - Full CRUD + admin pages (Service Line Administrator)
  { role: 'ADMINISTRATOR', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'clients', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'bd', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin.users', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin.templates', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin.service-lines', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin.permissions', allowedActions: ['READ', 'UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'admin.service-line-mapping', allowedActions: ['READ', 'UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'clients.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'clients.edit', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'clients.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects.archive', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'projects.assign-users', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'documents.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'acceptance.approve', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'mapping.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'adjustments.approve', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'adjustments.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'opinions.generate', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'opinions.publish', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'ADMINISTRATOR', resourceKey: 'bd.opportunities.create', allowedActions: ['CREATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'bd.opportunities.edit', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'bd.opportunities.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'bd.contacts.manage', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.approve-acceptance', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.approve-engagement-letter', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.manage', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.delete', allowedActions: ['DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.assign-team', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'ADMINISTRATOR', resourceKey: 'project.view', allowedActions: ['READ'] },

  // SYSTEM_ADMIN - Full CRUD on everything (bypass logic in code, but seeded for consistency)
  { role: 'SYSTEM_ADMIN', resourceKey: 'dashboard', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'clients', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'analytics', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'bd', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'notifications', allowedActions: ['READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin.users', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin.templates', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin.service-lines', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin.permissions', allowedActions: ['READ', 'UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'admin.service-line-mapping', allowedActions: ['READ', 'UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'clients.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'clients.view', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'clients.edit', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'clients.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects.edit', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects.archive', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'projects.assign-users', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'documents.upload', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'documents.download', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'documents.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'acceptance.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'acceptance.approve', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'acceptance.view', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'mapping.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'mapping.edit', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'mapping.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'adjustments.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'adjustments.approve', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'adjustments.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'opinions.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'opinions.edit', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'opinions.generate', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'opinions.publish', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'reports.generate', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'reports.export', allowedActions: ['READ'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'bd.opportunities.create', allowedActions: ['CREATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'bd.opportunities.edit', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'bd.opportunities.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'bd.contacts.manage', allowedActions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.approve-acceptance', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.approve-engagement-letter', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.manage', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.delete', allowedActions: ['DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.assign-team', allowedActions: ['CREATE', 'UPDATE', 'DELETE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.edit-data', allowedActions: ['UPDATE'] },
  { role: 'SYSTEM_ADMIN', resourceKey: 'project.view', allowedActions: ['READ'] },
];

async function main() {
  console.log('🌱 Seeding permissions...');

  // Create or update permissions
  console.log('📝 Creating permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        resourceType_resourceKey: {
          resourceType: perm.resourceType,
          resourceKey: perm.resourceKey,
        },
      },
      create: {
        resourceType: perm.resourceType,
        resourceKey: perm.resourceKey,
        displayName: perm.displayName,
        description: perm.description,
        availableActions: JSON.stringify(perm.availableActions),
        updatedAt: new Date(),
      },
      update: {
        displayName: perm.displayName,
        description: perm.description,
        availableActions: JSON.stringify(perm.availableActions),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✅ Created/updated ${permissions.length} permissions`);

  // Create or update role permissions
  console.log('🔐 Creating role permissions...');
  for (const rolePerm of rolePermissions) {
    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        resourceKey: rolePerm.resourceKey,
      },
    });

    if (!permission) {
      console.warn(`⚠️  Permission not found for resource: ${rolePerm.resourceKey}`);
      continue;
    }

    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: rolePerm.role,
          permissionId: permission.id,
        },
      },
      create: {
        role: rolePerm.role,
        permissionId: permission.id,
        allowedActions: JSON.stringify(rolePerm.allowedActions),
        updatedAt: new Date(),
      },
      update: {
        allowedActions: JSON.stringify(rolePerm.allowedActions),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✅ Created/updated ${rolePermissions.length} role permissions`);

  console.log('🎉 Permission seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

