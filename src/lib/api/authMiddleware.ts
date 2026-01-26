/**
 * API Route Authorization Middleware
 * 
 * Provides consistent authorization patterns across API routes.
 * Use these middleware wrappers instead of manual auth checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getServiceLineWhereClause, verifyServiceLineAccess } from '@/lib/utils/serviceLineFilter';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { isSystemAdmin } from '@/lib/utils/systemAdmin';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';

// For backward compatibility
type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

/**
 * Authenticated user context
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    role?: string;
    name: string | null;
  };
}

/**
 * Handler function with auth context
 */
export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Handler function with auth context and route params
 */
export type AuthenticatedHandlerWithParams<T = any> = (
  request: NextRequest,
  context: AuthContext & { params: T }
) => Promise<NextResponse>;

/**
 * Middleware: Require authentication
 * 
 * @example
 * export const GET = withAuth(async (request, { user }) => {
 *   // user is guaranteed to exist
 *   return NextResponse.json({ data: 'protected' });
 * });
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest) => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return handler(request, { user });
    } catch (error) {
      return handleApiError(error, 'withAuth');
    }
  };
}

/**
 * Middleware: Require authentication + permission
 * 
 * @deprecated Use withFeature() instead with Feature enum
 * @example
 * export const GET = withPermission('clients', 'READ', async (request, { user }) => {
 *   // user has clients.READ permission
 *   return NextResponse.json({ data: clients });
 * });
 */
export function withPermission(
  resource: string,
  action: PermissionAction,
  handler: AuthenticatedHandler
) {
  return withAuth(async (request, context) => {
    // This is deprecated - always deny access
    console.warn(`withPermission is deprecated. Use withFeature() instead. Resource: ${resource}, Action: ${action}`);
    
    return NextResponse.json(
      { error: 'Forbidden - withPermission is deprecated. Use withFeature() instead.' },
      { status: 403 }
    );
  });
}

/**
 * Middleware: Require authentication + feature
 * 
 * @example
 * export const GET = withFeature(Feature.MANAGE_CLIENTS, async (request, { user }) => {
 *   // user has manage_clients feature
 *   return NextResponse.json({ data: clients });
 * });
 */
export function withFeature(
  feature: Feature,
  handler: AuthenticatedHandler,
  serviceLine?: string
) {
  return withAuth(async (request, context) => {
    const hasFeature = await checkFeature(context.user.id, feature, serviceLine);
    
    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * Middleware: Require SYSTEM_ADMIN role
 * 
 * @example
 * export const DELETE = withSystemAdmin(async (request, { user }) => {
 *   // user is SYSTEM_ADMIN
 *   return NextResponse.json({ success: true });
 * });
 */
export function withSystemAdmin(handler: AuthenticatedHandler) {
  return withAuth(async (request, context) => {
    if (!isSystemAdmin(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden - SYSTEM_ADMIN required' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * @deprecated Use withSystemAdmin instead
 */
export const withSuperuser = withSystemAdmin;

/**
 * Middleware: Require service line access
 * 
 * @example
 * export const GET = withServiceLine('TAX', 'MANAGER', async (request, { user }) => {
 *   // user has MANAGER or higher role in TAX service line
 *   return NextResponse.json({ data: taxProjects });
 * });
 */
export function withServiceLine(
  serviceLine: string,
  minimumRole?: string,
  handler?: AuthenticatedHandler
) {
  // Allow both withServiceLine('TAX', handler) and withServiceLine('TAX', 'MANAGER', handler)
  const actualHandler = typeof minimumRole === 'function' ? minimumRole : handler;
  const actualMinRole = typeof minimumRole === 'string' ? minimumRole : undefined;

  if (!actualHandler) {
    throw new Error('Handler function is required');
  }

  return withAuth(async (request, context) => {
    // SYSTEM_ADMIN bypasses service line checks
    if (isSystemAdmin(context.user)) {
      return actualHandler(request, context);
    }

    const hasAccess = await verifyServiceLineAccess(context.user.id, serviceLine);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: `Forbidden - No access to ${serviceLine} service line` },
        { status: 403 }
      );
    }

    // If minimum role specified, check it
    if (actualMinRole) {
      const { getUserServiceLines } = await import('@/lib/services/service-lines/serviceLineService');
      const userServiceLines = await getUserServiceLines(context.user.id);
      const serviceLineUser = userServiceLines.find(sl => sl.serviceLine === serviceLine);
      
      if (serviceLineUser) {
        const { hasServiceLineRole } = await import('@/lib/utils/roleHierarchy');
        const hasRequiredRole = hasServiceLineRole(serviceLineUser.role, actualMinRole);
        
        if (!hasRequiredRole) {
          return NextResponse.json(
            { error: `Forbidden - ${actualMinRole} role required in ${serviceLine}` },
            { status: 403 }
          );
        }
      }
    }

    return actualHandler(request, context);
  });
}

/**
 * Middleware: Require project access
 * 
 * Use this for routes like /api/projects/[id]
 * The projectId will be extracted from params.
 * 
 * @example
 * export const GET = withProjectAccess(
 *   async (request, context, { params }) => {
 *     const { id } = await params;
 *     // user has access to project
 *     return NextResponse.json({ data: project });
 *   }
 * );
 */
export function withProjectAccess<T extends { id: string }>(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<T> }
  ) => Promise<NextResponse>,
  requiredRole?: string
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<T> }
  ) => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { id } = await routeContext.params;
      const taskIdNum = Number.parseInt(id);

      if (Number.isNaN(taskIdNum)) {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      const taskId = toTaskId(taskIdNum);
      const access = await checkTaskAccess(user.id, taskId, requiredRole);
      
      if (!access.canAccess) {
        return NextResponse.json(
          { error: 'Forbidden - No access to this task' },
          { status: 403 }
        );
      }

      return handler(request, { user }, routeContext);
    } catch (error) {
      return handleApiError(error, 'withTaskAccess');
    }
  };
}

/**
 * Middleware: Service line filtered list
 * 
 * Automatically applies service line filtering to list queries.
 * 
 * @example
 * export const GET = withServiceLineFilter(async (request, { user, serviceLineFilter }) => {
 *   const projects = await prisma.task.findMany({
 *     where: serviceLineFilter,
 *   });
 *   return NextResponse.json(successResponse(projects));
 * });
 */
export function withServiceLineFilter(
  handler: (
    request: NextRequest,
    context: AuthContext & { serviceLineFilter: { serviceLine: { in: string[] } } }
  ) => Promise<NextResponse>
) {
  return withAuth(async (request, context) => {
    const serviceLineFilter = await getServiceLineWhereClause(context.user.id);
    
    return handler(request, {
      ...context,
      serviceLineFilter,
    });
  });
}

/**
 * Combine multiple middleware
 * 
 * @example
 * export const PUT = combineMiddleware(
 *   withAuth,
 *   withPermission('projects', 'UPDATE')
 * )(async (request, { user }) => {
 *   // user is authenticated AND has projects.UPDATE permission
 *   return NextResponse.json({ success: true });
 * });
 */
export function combineMiddleware(...middlewares: any[]) {
  return (handler: AuthenticatedHandler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}

/**
 * Admin-only endpoint
 * 
 * Requires SYSTEM_ADMIN role.
 * 
 * @example
 * export const DELETE = adminOnly(async (request, { user }) => {
 *   // Only SYSTEM_ADMIN can access
 *   return NextResponse.json({ success: true });
 * });
 */
export const adminOnly = withSystemAdmin;

/**
 * Extract pagination params from request
 */
export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  offset: number;
} {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Extract sort params from request
 */
export function getSortParams(request: NextRequest, defaultSort: string = 'createdAt'): {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || defaultSort;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  return { sortBy, sortOrder };
}

