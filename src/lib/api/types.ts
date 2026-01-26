/**
 * Type-safe API utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionUser } from '@/lib/services/auth/auth';

/**
 * Generic API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Context provided to authenticated handlers
 */
export interface AuthenticatedContext<T = Record<string, string>> {
  params: T;
  user: SessionUser;
}

/**
 * Type for authenticated API route handlers
 */
export type AuthenticatedHandler<
  TParams = Record<string, string>,
  TResponse = unknown
> = (
  request: NextRequest,
  context: AuthenticatedContext<TParams>
) => Promise<NextResponse<ApiResponse<TResponse>>>;

/**
 * Type for project-scoped API route handlers
 */
export type ProjectHandler<
  TParams = Record<string, string>,
  TResponse = unknown
> = (
  request: NextRequest,
  context: AuthenticatedContext<TParams>,
  taskId: number
) => Promise<NextResponse<ApiResponse<TResponse>>>;


























