/**
 * Standardized response helpers for API routes
 * Ensures consistent response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { ErrorCodes } from './errorHandler';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Standard success response format
 */
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Return a standardized 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.UNAUTHORIZED,
    },
    { status: 401 }
  );
}

/**
 * Return a standardized 403 Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.FORBIDDEN,
    },
    { status: 403 }
  );
}

/**
 * Return a standardized 404 Not Found response
 */
export function notFoundResponse(message = 'Not found'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.NOT_FOUND,
    },
    { status: 404 }
  );
}

/**
 * Return a standardized 400 Bad Request response
 */
export function badRequestResponse(
  message = 'Bad request',
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.VALIDATION_ERROR,
      ...(details ? { details } : {}),
    },
    { status: 400 }
  );
}

/**
 * Return a standardized 409 Conflict response
 */
export function conflictResponse(message = 'Conflict'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.CONFLICT,
    },
    { status: 409 }
  );
}

/**
 * Return a standardized 500 Internal Server Error response
 */
export function internalErrorResponse(
  message = 'Internal server error'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.INTERNAL_ERROR,
    },
    { status: 500 }
  );
}

/**
 * Return a standardized 429 Too Many Requests response
 */
export function tooManyRequestsResponse(
  message = 'Too many requests',
  retryAfter?: number
): NextResponse<ErrorResponse> {
  const headers: Record<string, string> = {};
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Return a standardized success response
 * @deprecated Use successResponse from apiUtils instead (this function is never used)
 */
export function okResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

/**
 * Return a standardized 201 Created response
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
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

















