/**
 * Page Access Control Types
 * Role-based page permissions supporting both System and Service Line roles
 */

import { SystemRole, ServiceLineRole } from './index';

/**
 * Page access levels
 * - NONE: User cannot access page (redirect to dashboard)
 * - VIEW: User can view page but no edit/create/delete actions
 * - FULL: User has complete access to all features
 */
export enum PageAccessLevel {
  NONE = 'NONE',
  VIEW = 'VIEW',
  FULL = 'FULL',
}

/**
 * All roles that can have page permissions
 * Combines System roles and Service Line roles
 */
export type PageRole = SystemRole | ServiceLineRole;

/**
 * Page permission map structure
 * Maps page paths to role-based access levels
 */
export type PagePermissionMap = Record<string, Partial<Record<PageRole, PageAccessLevel>>>;

/**
 * Result of page access check
 */
export interface PageAccessResult {
  canAccess: boolean;
  accessLevel: PageAccessLevel;
  matchedPattern?: string;
  role?: PageRole;
}

/**
 * Page info from discovery
 */
export interface PageInfo {
  pathname: string;
  filePath: string;
  category?: string;
  pageTitle?: string;
}

/**
 * Page permission with metadata
 */
export interface PagePermission {
  id: number;
  pathname: string;
  role: string;
  accessLevel: PageAccessLevel;
  description?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

/**
 * Page registry entry
 */
export interface PageRegistryEntry {
  id: number;
  pathname: string;
  pageTitle?: string | null;
  category?: string | null;
  discovered: boolean;
  active: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}






















