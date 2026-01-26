/**
 * Page Discovery Service
 * Automatically discovers all dashboard pages by scanning the file system
 */

import fs from 'fs';
import path from 'path';
import { PageInfo, PageAccessLevel } from '@/types/pagePermissions';
import { ServiceLineRole } from '@/types';

/**
 * Discover all dashboard pages by scanning the file system
 */
export async function discoverPages(): Promise<PageInfo[]> {
  const pagesDir = path.join(process.cwd(), 'src/app/dashboard');
  const pages: PageInfo[] = [];

  /**
   * Recursively scan directory for page.tsx files
   */
  function scanDir(dir: string, urlPath: string = '/dashboard') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip private/internal directories
        if (entry.name.startsWith('_') || entry.name === 'api') {
          continue;
        }

        if (entry.isDirectory()) {
          // Convert [param] to :param for pattern matching
          const segment = entry.name.startsWith('[') && entry.name.endsWith(']')
            ? ':' + entry.name.slice(1, -1)
            : entry.name;
          
          scanDir(path.join(dir, entry.name), `${urlPath}/${segment}`);
        } else if (entry.name === 'page.tsx') {
          pages.push({
            pathname: urlPath,
            filePath: path.join(dir, entry.name),
            category: inferCategory(urlPath),
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  scanDir(pagesDir);
  return pages;
}

/**
 * Infer page category from pathname
 */
function inferCategory(pathname: string): string {
  if (pathname.startsWith('/dashboard/admin')) {
    return 'admin';
  }
  if (pathname.includes('/analytics')) {
    return 'analytics';
  }
  if (pathname.includes('/bd')) {
    return 'business-development';
  }
  if (pathname.includes('/clients')) {
    return 'clients';
  }
  if (pathname.includes('/tasks')) {
    return 'tasks';
  }
  if (pathname.includes('/templates')) {
    return 'templates';
  }
  if (pathname === '/dashboard') {
    return 'dashboard';
  }
  return 'general';
}

/**
 * Get convention-based default permissions for a page
 * Returns permissions for all roles based on URL patterns
 */
export function getConventionBasedPermission(pathname: string): Record<string, PageAccessLevel> {
  // Admin pages: SYSTEM_ADMIN only
  if (pathname.startsWith('/dashboard/admin')) {
    return {
      SYSTEM_ADMIN: PageAccessLevel.FULL,
      ADMINISTRATOR: PageAccessLevel.NONE,
      PARTNER: PageAccessLevel.NONE,
      MANAGER: PageAccessLevel.NONE,
      SUPERVISOR: PageAccessLevel.NONE,
      USER: PageAccessLevel.NONE,
      VIEWER: PageAccessLevel.NONE,
    };
  }

  // Analytics pages: PARTNER and above
  if (pathname.includes('/analytics')) {
    return {
      SYSTEM_ADMIN: PageAccessLevel.FULL,
      ADMINISTRATOR: PageAccessLevel.FULL,
      PARTNER: PageAccessLevel.FULL,
      MANAGER: PageAccessLevel.VIEW,
      SUPERVISOR: PageAccessLevel.NONE,
      USER: PageAccessLevel.NONE,
      VIEWER: PageAccessLevel.NONE,
    };
  }

  // BD pages: PARTNER and above
  if (pathname.includes('/bd')) {
    return {
      SYSTEM_ADMIN: PageAccessLevel.FULL,
      ADMINISTRATOR: PageAccessLevel.FULL,
      PARTNER: PageAccessLevel.FULL,
      MANAGER: PageAccessLevel.VIEW,
      SUPERVISOR: PageAccessLevel.NONE,
      USER: PageAccessLevel.NONE,
      VIEWER: PageAccessLevel.NONE,
    };
  }

  // Templates/reference: VIEW for most, EDIT for managers+
  if (pathname.includes('/templates')) {
    return {
      SYSTEM_ADMIN: PageAccessLevel.FULL,
      ADMINISTRATOR: PageAccessLevel.FULL,
      PARTNER: PageAccessLevel.FULL,
      MANAGER: PageAccessLevel.FULL,
      SUPERVISOR: PageAccessLevel.VIEW,
      USER: PageAccessLevel.VIEW,
      VIEWER: PageAccessLevel.VIEW,
    };
  }

  // Regular pages: Full for active workers, VIEW for viewers
  return {
    SYSTEM_ADMIN: PageAccessLevel.FULL,
    ADMINISTRATOR: PageAccessLevel.FULL,
    PARTNER: PageAccessLevel.FULL,
    MANAGER: PageAccessLevel.FULL,
    SUPERVISOR: PageAccessLevel.FULL,
    USER: PageAccessLevel.FULL,
    VIEWER: PageAccessLevel.VIEW,
  };
}

/**
 * Extract service line from pathname
 * Example: /dashboard/tax/... -> TAX
 */
export function extractServiceLineFromPath(pathname: string): string | null {
  const parts = pathname.split('/');
  
  // Check if path has service line segment after /dashboard
  if (parts.length >= 3 && parts[1] === 'dashboard' && parts[2]) {
    const segment = parts[2].toUpperCase();
    
    // Known service lines (all from ServiceLine enum)
    const serviceLines = ['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT'];
    
    if (serviceLines.includes(segment)) {
      return segment;
    }
  }
  
  return null;
}























