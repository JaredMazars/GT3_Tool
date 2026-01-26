import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { logError, logWarn } from './logger';

/**
 * Custom application error class for structured error handling
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Acceptance module specific error codes
 */
export const AcceptanceErrorCodes = {
  QUESTIONNAIRE_NOT_INITIALIZED: 'QUESTIONNAIRE_NOT_INITIALIZED',
  ALREADY_SUBMITTED: 'ALREADY_SUBMITTED',
  ALREADY_APPROVED: 'ALREADY_APPROVED',
  INCOMPLETE_QUESTIONNAIRE: 'INCOMPLETE_QUESTIONNAIRE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_DOCUMENT_TYPE: 'INVALID_DOCUMENT_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CANNOT_MODIFY_AFTER_REVIEW: 'CANNOT_MODIFY_AFTER_REVIEW',
  INVALID_QUESTIONNAIRE_TYPE: 'INVALID_QUESTIONNAIRE_TYPE',
} as const;

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return new AppError(
        409,
        `A record with this ${field} already exists`,
        ErrorCodes.CONFLICT,
        { field, constraint: error.code }
      );
    
    case 'P2025':
      // Record not found
      return new AppError(
        404,
        'The requested record was not found',
        ErrorCodes.NOT_FOUND,
        { prismaCode: error.code }
      );
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        400,
        'Invalid reference: the related record does not exist',
        ErrorCodes.VALIDATION_ERROR,
        { prismaCode: error.code }
      );
    
    case 'P2014':
      // Required relation violation
      return new AppError(
        400,
        'The change would violate required relation constraints',
        ErrorCodes.VALIDATION_ERROR,
        { prismaCode: error.code }
      );
    
    default:
      return new AppError(
        500,
        'A database error occurred',
        ErrorCodes.DATABASE_ERROR,
        { prismaCode: error.code }
      );
  }
}

/**
 * Type guard for OpenAI-like errors
 */
interface OpenAILikeError {
  status?: number;
  message?: string;
}

function isOpenAILikeError(error: unknown): error is OpenAILikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'message' in error)
  );
}

/**
 * Handle OpenAI API errors
 */
function handleOpenAIError(error: OpenAILikeError): AppError {
  if (error.status === 429) {
    return new AppError(
      429,
      'AI service rate limit exceeded. Please try again later.',
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      { service: 'openai' }
    );
  }
  
  if (error.status === 401) {
    return new AppError(
      500,
      'AI service authentication failed',
      ErrorCodes.EXTERNAL_API_ERROR,
      { service: 'openai' }
    );
  }
  
  return new AppError(
    500,
    'AI service temporarily unavailable',
    ErrorCodes.EXTERNAL_API_ERROR,
    { service: 'openai', originalError: error.message }
  );
}

/**
 * Centralized error handler for API routes
 * 
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @returns NextResponse with appropriate error structure
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Check if this is an aborted request (client disconnected)
  const isAborted = error instanceof Error && 
    (error.message === 'aborted' || error.name === 'AbortError');
  
  // Don't log aborted requests as errors (they're expected when components unmount)
  if (isAborted) {
    if (context) {
      logWarn(`Request aborted in ${context}`, { message: 'Client disconnected' });
    }
    // Return 499 Client Closed Request (nginx convention)
    return NextResponse.json(
      {
        success: false,
        error: 'Request cancelled',
        code: 'REQUEST_CANCELLED',
      },
      { status: 499 }
    );
  }
  
  // Log the error with structured logging
  if (context) {
    logError(`API Error in ${context}`, error);
  } else {
    logError('API Error', error);
  }
  
  // Handle AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
  }
  
  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = handlePrismaError(error);
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code,
        ...(process.env.NODE_ENV === 'development' && appError.details ? { details: appError.details } : {}),
      },
      { status: appError.statusCode }
    );
  }
  
  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid data provided',
        code: ErrorCodes.VALIDATION_ERROR,
      },
      { status: 400 }
    );
  }
  
  // Handle Zod validation errors
  if (error?.constructor?.name === 'ZodError') {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: ErrorCodes.VALIDATION_ERROR,
        ...(process.env.NODE_ENV === 'development' && (error as any)?.errors ? { details: (error as any).errors } : {}),
      },
      { status: 400 }
    );
  }
  
  // Handle OpenAI errors (check for error.status property)
  if (isOpenAILikeError(error)) {
    const appError = handleOpenAIError(error);
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        code: ErrorCodes.INTERNAL_ERROR,
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
      },
      { status: 500 }
    );
  }
  
  // Handle unknown error types
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: ErrorCodes.INTERNAL_ERROR,
    },
    { status: 500 }
  );
}

/**
 * Validation helper to ensure required environment variables are set
 */
export function validateEnvVariables(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

/**
 * Async error wrapper for API route handlers
 * Catches errors and passes them to handleApiError
 */
export function asyncHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}


