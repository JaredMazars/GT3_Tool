/**
 * API route middleware for authentication and authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
import { parseProjectId } from '@/lib/utils/apiUtils';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { ServiceLine, ServiceLineRole } from '@/types';
import { AuthenticatedHandler, ProjectHandler, ApiResponse } from './types';
import { unauthorizedResponse, forbiddenResponse, badRequestResponse, internalErrorResponse } from '@/lib/utils/responseHelpers';

/**
 * Middleware to require authentication
 * Wraps a handler and ensures user is authenticated
 */
export function withAuth<TParams extends Record<string, string>, TResponse>(
  handler: AuthenticatedHandler<TParams, TResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse<ApiResponse<TResponse>>> => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        return unauthorizedResponse() as NextResponse<ApiResponse<TResponse>>;
      }

      const params = await context.params;
      return handler(request, { params, user });
    } catch (error) {
      return internalErrorResponse(
        error instanceof Error ? error.message : 'Internal server error'
      ) as NextResponse<ApiResponse<TResponse>>;
    }
  };
}

/**
 * Middleware to require project access
 * Wraps a handler and ensures user has access to the project
 */
export function withProjectAccess<TParams extends Record<string, string> & { id: string }, TResponse>(
  requiredRole?: string
) {
  return (handler: ProjectHandler<TParams, TResponse>) => {
    return withAuth<TParams, TResponse>(async (request, context) => {
      try {
        const projectId = parseProjectId(context.params.id);
        const hasAccess = await checkProjectAccess(
          context.user.id,
          projectId,
          requiredRole
        );

        if (!hasAccess) {
          return forbiddenResponse() as NextResponse<ApiResponse<TResponse>>;
        }

        return handler(request, context, projectId);
      } catch (error) {
        return internalErrorResponse(
          error instanceof Error ? error.message : 'Internal server error'
        ) as NextResponse<ApiResponse<TResponse>>;
      }
    });
  };
}

/**
 * Middleware to require service line access
 * Wraps a handler and ensures user has access to the service line
 */
export function withServiceLineAccess<TParams extends Record<string, string> & { serviceLine: string }, TResponse>(
  requiredRole?: ServiceLineRole | string
) {
  return (handler: AuthenticatedHandler<TParams, TResponse>) => {
    return withAuth<TParams, TResponse>(async (request, context) => {
      try {
        const serviceLine = context.params.serviceLine;

        // Validate service line
        if (!isValidServiceLine(serviceLine.toUpperCase())) {
          return badRequestResponse('Invalid service line') as NextResponse<ApiResponse<TResponse>>;
        }

        // Check access
        const hasAccess = await checkServiceLineAccess(
          context.user.id,
          serviceLine.toUpperCase(),
          requiredRole
        );

        if (!hasAccess) {
          return forbiddenResponse('Access denied to this service line') as NextResponse<ApiResponse<TResponse>>;
        }

        return handler(request, context);
      } catch (error) {
        return internalErrorResponse(
          error instanceof Error ? error.message : 'Internal server error'
        ) as NextResponse<ApiResponse<TResponse>>;
      }
    });
  };
}

/**
 * Helper to validate request body with Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T; safeParse?: (data: unknown) => { success: boolean; data?: T; error?: unknown } }
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}














