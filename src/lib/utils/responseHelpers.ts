/**
 * Standardized response helpers for API routes
 * 
 * NOTE: Most response helpers are now handled by secureRoute wrapper.
 * This file only contains specialized response types (201, 204) that may be useful for edge cases.
 * 
 * For standard responses:
 * - Success (200): Use `successResponse()` from `@/lib/utils/apiUtils`
 * - Errors: Use `AppError` and `handleApiError()` from `@/lib/utils/errorHandler`
 * - Auth/Permission: Handled automatically by `secureRoute` wrapper
 */

import { NextResponse } from 'next/server';

/**
 * Standard success response format
 */
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Return a standardized 201 Created response
 * Use this for POST requests that create new resources
 */
export function createdResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status: 201 }
  );
}

/**
 * Return a standardized 204 No Content response
 * Use this for DELETE requests or operations with no response body
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
