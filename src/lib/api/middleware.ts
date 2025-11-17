/**
 * API route middleware for authentication and authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { parseProjectId } from '@/lib/utils/apiUtils';
import { AuthenticatedHandler, ProjectHandler, ApiResponse } from './types';

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
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const params = await context.params;
      return handler(request, { params, user });
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Internal server error' 
        },
        { status: 500 }
      );
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
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          );
        }

        return handler(request, context, projectId);
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            error: error instanceof Error ? error.message : 'Internal server error' 
          },
          { status: 500 }
        );
      }
    });
  };
}

/**
 * Helper to validate request body with Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}













