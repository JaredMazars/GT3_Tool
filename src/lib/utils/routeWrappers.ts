/**
 * Route Wrappers
 * Higher-order functions for standardizing API route patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission, PermissionAction } from '@/lib/services/permissions/permissionService';

/**
 * User from getCurrentUser with full details
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Context for route handlers (supports both dynamic and static routes)
 */
export type RouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

/**
 * Route handler function with authenticated user
 */
export type AuthenticatedRouteHandler<T = unknown> = (
  request: NextRequest,
  context: RouteContext,
  user: AuthenticatedUser
) => Promise<NextResponse<T>>;

/**
 * Standard error responses
 */
export const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export const forbidden = (message = 'Forbidden - Insufficient permissions') =>
  NextResponse.json({ error: message }, { status: 403 });

export const badRequest = (message = 'Bad Request') =>
  NextResponse.json({ error: message }, { status: 400 });

export const notFound = (message = 'Not Found') =>
  NextResponse.json({ error: message }, { status: 404 });

/**
 * Wraps a route handler with authentication check
 * 
 * @example
 * export const GET = withAuth(async (req, context, user) => {
 *   // Your route logic here with authenticated user
 *   return NextResponse.json({ data: 'success' });
 * });
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedRouteHandler<T>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T>> {
  return async (request: NextRequest, context: RouteContext) => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized() as NextResponse<T>;
    }

    return handler(request, context, user as AuthenticatedUser);
  };
}

/**
 * Wraps a route handler with authentication and permission check
 * 
 * @param handler - The route handler function
 * @param resource - The resource key to check permission for
 * @param action - The action to perform (CREATE, READ, UPDATE, DELETE)
 * 
 * @example
 * export const GET = withPermission(
 *   async (req, context, user) => {
 *     // Your route logic here
 *     return NextResponse.json({ data: 'success' });
 *   },
 *   'projects',
 *   'READ'
 * );
 */
export function withPermission<T = unknown>(
  handler: AuthenticatedRouteHandler<T>,
  resource: string,
  action: PermissionAction
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T>> {
  return async (request: NextRequest, context: RouteContext) => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized() as NextResponse<T>;
    }

    const hasPermission = await checkUserPermission(user.id, resource, action);
    if (!hasPermission) {
      return forbidden() as NextResponse<T>;
    }

    return handler(request, context, user as AuthenticatedUser);
  };
}

/**
 * Wraps a route handler with authentication, permission check, and custom validation
 * 
 * @param handler - The route handler function
 * @param resource - The resource key to check permission for
 * @param action - The action to perform
 * @param validator - Custom validation function that returns true if valid
 * @param validationErrorMessage - Error message if validation fails
 * 
 * @example
 * export const GET = withPermissionAndValidation(
 *   async (req, context, user) => {
 *     return NextResponse.json({ data: 'success' });
 *   },
 *   'projects',
 *   'READ',
 *   async (req, context, user) => {
 *     // Custom validation logic
 *     return true;
 *   },
 *   'Validation failed'
 * );
 */
export function withPermissionAndValidation<T = unknown>(
  handler: AuthenticatedRouteHandler<T>,
  resource: string,
  action: PermissionAction,
  validator: (
    request: NextRequest,
    context: RouteContext,
    user: AuthenticatedUser
  ) => Promise<boolean>,
  validationErrorMessage = 'Validation failed'
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T>> {
  return async (request: NextRequest, context: RouteContext) => {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized() as NextResponse<T>;
    }

    const hasPermission = await checkUserPermission(user.id, resource, action);
    if (!hasPermission) {
      return forbidden() as NextResponse<T>;
    }

    const isValid = await validator(request, context, user as AuthenticatedUser);
    if (!isValid) {
      return badRequest(validationErrorMessage) as NextResponse<T>;
    }

    return handler(request, context, user as AuthenticatedUser);
  };
}

