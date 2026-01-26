/**
 * Centralized Security Route Wrapper
 * 
 * Provides a unified wrapper for API routes that applies:
 * - Authentication checks
 * - Rate limiting
 * - Input sanitization
 * - Feature/permission checks
 * - Structured error handling
 * - Performance tracking
 * 
 * Usage:
 * ```typescript
 * export const POST = secureRoute.mutation({
 *   feature: Feature.MANAGE_TASKS,
 *   schema: CreateTaskSchema,
 *   handler: async (request, { user, data }) => {
 *     // data is sanitized and validated
 *     return NextResponse.json(successResponse(result));
 *   },
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, type SessionUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { isSystemAdmin } from '@/lib/utils/systemAdmin';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { enforceRateLimit, checkRateLimit, enforceUserRateLimit, checkUserRateLimit, RateLimitPresets, type RateLimitConfig } from '@/lib/utils/rateLimit';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { logger } from '@/lib/utils/logger';
import { toTaskId, type TaskId } from '@/types/branded';

/**
 * Security context passed to handlers
 */
export interface SecureContext<TData = unknown> {
  /** Authenticated user */
  user: SessionUser;
  /** Sanitized and validated request data (for mutations) */
  data: TData;
  /** Rate limit info */
  rateLimit: {
    remaining: number;
    limit: number;
    resetTime: number;
  };
}

/**
 * Context for routes with params (e.g., [id])
 */
export interface SecureContextWithParams<TData = unknown, TParams = unknown> extends SecureContext<TData> {
  params: TParams;
}

/**
 * Handler function signature for simple routes
 */
export type SecureHandler<TData = unknown> = (
  request: NextRequest,
  context: SecureContext<TData>
) => Promise<NextResponse>;

/**
 * Handler function signature for routes with params
 */
export type SecureHandlerWithParams<TData = unknown, TParams = unknown> = (
  request: NextRequest,
  context: SecureContextWithParams<TData, TParams>
) => Promise<NextResponse>;

/**
 * Configuration options for secure routes
 */
export interface SecureRouteOptions<TSchema extends z.ZodSchema = z.ZodSchema> {
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  
  /** Feature permission to check */
  feature?: Feature;
  
  /** Require service line assignment */
  requireServiceLine?: boolean;
  
  /** Service line code to check access for */
  serviceLine?: string;
  
  /** Rate limit configuration (false to disable) */
  rateLimit?: RateLimitConfig | false;
  
  /** Zod schema for request body validation */
  schema?: TSchema;
  
  /** Whether to sanitize input (default: true for mutations) */
  sanitize?: boolean;
  
  /** Handler function */
  handler: SecureHandler<z.infer<TSchema>>;
}

/**
 * Configuration for routes with params
 */
export interface SecureRouteOptionsWithParams<
  TSchema extends z.ZodSchema = z.ZodSchema,
  TParams = unknown
> extends Omit<SecureRouteOptions<TSchema>, 'handler'> {
  /** Task ID parameter name for task access checks */
  taskIdParam?: string;
  
  /** Required role for task access */
  taskRole?: string;
  
  /** Handler function with params */
  handler: SecureHandlerWithParams<z.infer<TSchema>, TParams>;
}

/**
 * Internal implementation of the security wrapper
 */
async function withSecurity<TSchema extends z.ZodSchema>(
  request: NextRequest,
  options: SecureRouteOptions<TSchema> & { 
    isMutation: boolean;
    routeContext?: { params: Promise<Record<string, string>> };
    taskIdParam?: string;
    taskRole?: string;
  }
): Promise<NextResponse> {
  const startTime = Date.now();
  const endpoint = request.nextUrl.pathname;
  
  try {
    // 1. Authentication (do this first to get userId for per-user rate limiting)
    let user: SessionUser | null = null;
    
    if (options.requireAuth !== false) {
      user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    // 2. Rate limiting (if enabled) - use per-user if authenticated
    let rateLimitInfo = { remaining: 999, limit: 999, resetTime: Date.now() + 60000 };
    
    if (options.rateLimit !== false) {
      const config = options.rateLimit || (options.isMutation ? RateLimitPresets.STANDARD : RateLimitPresets.READ_ONLY);
      
      if (user) {
        // Per-user rate limiting (includes IP-based limiting by default)
        await enforceUserRateLimit(request, user.id, config);
        const rateLimitResult = await checkUserRateLimit(request, user.id, config);
        rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          resetTime: rateLimitResult.resetTime,
        };
      } else {
        // IP-only rate limiting for unauthenticated requests
        await enforceRateLimit(request, config);
        const rateLimitResult = await checkRateLimit(request, config);
        rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          resetTime: rateLimitResult.resetTime,
        };
      }
    }
    
    // 3. Authorization checks (run in parallel for performance)
    if (user && (options.feature || options.requireServiceLine)) {
      const checks: Promise<boolean>[] = [];
      
      if (options.feature) {
        checks.push(checkFeature(user.id, options.feature, options.serviceLine));
      }
      
      if (options.requireServiceLine) {
        checks.push(
          getUserSubServiceLineGroups(user.id).then(groups => groups.length > 0)
        );
      }
      
      const results = await Promise.all(checks);
      
      // For feature check, it must pass
      if (options.feature && !results[0]) {
        // Check if they have service line access as fallback
        if (options.requireServiceLine && results.length > 1 && results[1]) {
          // Has service line access, allow
        } else {
          logger.warn('Permission denied', { 
            userId: user.id, 
            feature: options.feature,
            endpoint,
          });
          
          return NextResponse.json(
            { success: false, error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }
      }
    }
    
    // 4. Parse params if route context provided
    let params: Record<string, string> = {};
    if (options.routeContext?.params) {
      params = await options.routeContext.params;
    }
    
    // 5. Task access check if taskIdParam specified
    if (user && options.taskIdParam && params[options.taskIdParam]) {
      const taskIdValue = params[options.taskIdParam] as string;
      const taskIdNum = Number.parseInt(taskIdValue, 10);
      
      if (Number.isNaN(taskIdNum)) {
        return NextResponse.json(
          { success: false, error: 'Invalid task ID' },
          { status: 400 }
        );
      }
      
      const taskId = toTaskId(taskIdNum);
      const access = await checkTaskAccess(user.id, taskId, options.taskRole);
      
      if (!access.canAccess) {
        logger.warn('Task access denied', { 
          userId: user.id, 
          taskId,
          requiredRole: options.taskRole,
        });
        
        return NextResponse.json(
          { success: false, error: 'Forbidden - No access to this task' },
          { status: 403 }
        );
      }
    }
    
    // 6. Parse and validate request body (for mutations)
    let data: z.infer<TSchema> | undefined;
    
    if (options.isMutation && options.schema) {
      try {
        const body = await request.json();
        
        // Sanitize input if enabled (default for mutations)
        const sanitizedBody = options.sanitize !== false 
          ? sanitizeObject(body) 
          : body;
        
        // Validate with Zod schema
        data = options.schema.parse(sanitizedBody);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const message = error.errors
            .map(e => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          
          return NextResponse.json(
            { 
              success: false, 
              error: `Validation failed: ${message}`,
              code: ErrorCodes.VALIDATION_ERROR,
            },
            { status: 400 }
          );
        }
        throw error;
      }
    }
    
    // 7. Execute handler
    const context: SecureContext<z.infer<TSchema>> = {
      user: user!,
      data: data as z.infer<TSchema>,
      rateLimit: rateLimitInfo,
    };
    
    // Add params if available
    if (Object.keys(params).length > 0) {
      (context as SecureContextWithParams).params = params;
    }
    
    const response = await options.handler(request, context);
    
    // 8. Track performance
    performanceMonitor.trackApiCall(endpoint, startTime, false);
    
    return response;
    
  } catch (error) {
    performanceMonitor.trackApiCall(`${endpoint} [ERROR]`, startTime, false);
    return handleApiError(error, endpoint);
  }
}

/**
 * Create a secure route wrapper for mutation endpoints (POST, PUT, PATCH, DELETE)
 * 
 * Features:
 * - Rate limiting (STANDARD preset by default)
 * - Input sanitization enabled by default
 * - Zod schema validation
 * - Authentication required by default
 */
function mutation<TSchema extends z.ZodSchema>(
  options: SecureRouteOptions<TSchema>
): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) => 
    withSecurity(request, { 
      ...options, 
      isMutation: true,
      rateLimit: options.rateLimit ?? RateLimitPresets.STANDARD,
      sanitize: options.sanitize ?? true,
    });
}

/**
 * Create a secure route wrapper for mutation endpoints with params
 */
function mutationWithParams<
  TSchema extends z.ZodSchema,
  TParams extends Record<string, string>
>(
  options: SecureRouteOptionsWithParams<TSchema, TParams>
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  return (request: NextRequest, routeContext: { params: Promise<TParams> }) =>
    withSecurity(request, {
      ...options,
      isMutation: true,
      rateLimit: options.rateLimit ?? RateLimitPresets.STANDARD,
      sanitize: options.sanitize ?? true,
      routeContext: routeContext as { params: Promise<Record<string, string>> },
      handler: options.handler as SecureHandler<z.infer<TSchema>>,
    });
}

/**
 * Create a secure route wrapper for query endpoints (GET)
 * 
 * Features:
 * - Rate limiting (READ_ONLY preset by default)
 * - No input sanitization (no body)
 * - Authentication required by default
 */
function query<TSchema extends z.ZodSchema = z.ZodSchema>(
  options: Omit<SecureRouteOptions<TSchema>, 'schema' | 'sanitize'>
): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) =>
    withSecurity(request, {
      ...options,
      isMutation: false,
      rateLimit: options.rateLimit ?? RateLimitPresets.READ_ONLY,
      sanitize: false,
    } as SecureRouteOptions<TSchema> & { isMutation: boolean });
}

/**
 * Create a secure route wrapper for query endpoints with params
 */
function queryWithParams<TParams extends Record<string, string>>(
  options: Omit<SecureRouteOptionsWithParams<z.ZodSchema, TParams>, 'schema' | 'sanitize'>
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  return (request: NextRequest, routeContext: { params: Promise<TParams> }) =>
    withSecurity(request, {
      ...options,
      isMutation: false,
      rateLimit: options.rateLimit ?? RateLimitPresets.READ_ONLY,
      sanitize: false,
      routeContext: routeContext as { params: Promise<Record<string, string>> },
      handler: options.handler as SecureHandler,
    });
}

/**
 * Create a secure route wrapper for AI endpoints (expensive operations)
 * 
 * Features:
 * - Strict rate limiting (AI_ENDPOINTS preset)
 * - Input sanitization enabled
 * - Authentication required
 */
function ai<TSchema extends z.ZodSchema>(
  options: SecureRouteOptions<TSchema>
): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) =>
    withSecurity(request, {
      ...options,
      isMutation: true,
      rateLimit: RateLimitPresets.AI_ENDPOINTS,
      sanitize: true,
    });
}

/**
 * Create a secure route wrapper for AI endpoints with params
 */
function aiWithParams<
  TSchema extends z.ZodSchema,
  TParams extends Record<string, string>
>(
  options: SecureRouteOptionsWithParams<TSchema, TParams>
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  return (request: NextRequest, routeContext: { params: Promise<TParams> }) =>
    withSecurity(request, {
      ...options,
      isMutation: true,
      rateLimit: RateLimitPresets.AI_ENDPOINTS,
      sanitize: true,
      routeContext: routeContext as { params: Promise<Record<string, string>> },
      handler: options.handler as SecureHandler<z.infer<TSchema>>,
    });
}

/**
 * Create a secure route wrapper for file upload endpoints
 * 
 * Features:
 * - File upload rate limiting
 * - Authentication required
 */
function fileUpload(
  options: Omit<SecureRouteOptions, 'schema' | 'sanitize'>
): (request: NextRequest) => Promise<NextResponse> {
  return (request: NextRequest) =>
    withSecurity(request, {
      ...options,
      isMutation: true,
      rateLimit: RateLimitPresets.FILE_UPLOADS,
      sanitize: false, // File uploads handle their own validation
    } as SecureRouteOptions & { isMutation: boolean });
}

/**
 * Create a secure route wrapper for file upload endpoints with params
 */
function fileUploadWithParams<TParams extends Record<string, string>>(
  options: Omit<SecureRouteOptionsWithParams<z.ZodSchema, TParams>, 'schema' | 'sanitize'>
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  return (request: NextRequest, routeContext: { params: Promise<TParams> }) =>
    withSecurity(request, {
      ...options,
      isMutation: true,
      rateLimit: RateLimitPresets.FILE_UPLOADS,
      sanitize: false,
      routeContext: routeContext as { params: Promise<Record<string, string>> },
      handler: options.handler as SecureHandler,
    });
}

/**
 * Centralized security route wrapper
 * 
 * Provides pre-configured wrappers for different endpoint types:
 * - `mutation`: For POST, PUT, PATCH, DELETE with standard rate limiting
 * - `query`: For GET with read-only rate limiting
 * - `ai`: For AI endpoints with strict rate limiting
 * - `fileUpload`: For file upload endpoints
 * 
 * Each also has a `*WithParams` variant for routes with dynamic segments.
 */
export const secureRoute = {
  mutation,
  mutationWithParams,
  query,
  queryWithParams,
  ai,
  aiWithParams,
  fileUpload,
  fileUploadWithParams,
} as const;

// Re-export types for convenience
export type { RateLimitConfig } from '@/lib/utils/rateLimit';
export { RateLimitPresets } from '@/lib/utils/rateLimit';
export { Feature } from '@/lib/permissions/features';
