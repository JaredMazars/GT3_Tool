/**
 * Safe JSON parsing with Zod validation
 * Prevents runtime errors from corrupted database data
 */

import { z } from 'zod';
import { logger } from './logger';
import { AppError, ErrorCodes } from './errorHandler';
import {
  CreditAnalysisReportSchema,
  FinancialRatiosSchema,
} from '@/lib/validation/schemas';
import type { CreditAnalysisReport, FinancialRatios } from '@/types/analytics';

/**
 * Safely parse and validate JSON string with a Zod schema
 */
export function safeParseJSON<T>(
  jsonString: string | null | undefined,
  schema: z.ZodSchema<T>,
  context: string
): T {
  if (!jsonString) {
    throw new AppError(
      500,
      `Missing required JSON data: ${context}`,
      ErrorCodes.VALIDATION_ERROR
    );
  }

  try {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(`JSON validation failed for ${context}`, {
        error: error.errors,
        jsonString: jsonString.substring(0, 200), // Log first 200 chars
      });
      throw new AppError(
        500,
        `Invalid data format: ${context}`,
        ErrorCodes.VALIDATION_ERROR,
        { zodErrors: error.errors }
      );
    }

    logger.error(`JSON parsing failed for ${context}`, {
      error,
      jsonString: jsonString.substring(0, 200),
    });
    throw new AppError(
      500,
      `Corrupted data: ${context}`,
      ErrorCodes.INTERNAL_ERROR
    );
  }
}

/**
 * Safely parse and validate JSON with fallback
 */
export function safeParseJSONWithFallback<T>(
  jsonString: string | null | undefined,
  schema: z.ZodSchema<T>,
  fallback: T,
  context: string
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    logger.warn(`JSON parsing failed for ${context}, using fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

/**
 * Parse credit analysis report from database JSON
 */
export function parseCreditAnalysisReport(
  jsonString: string | null
): CreditAnalysisReport {
  return safeParseJSON(
    jsonString,
    CreditAnalysisReportSchema,
    'CreditAnalysisReport'
  );
}

/**
 * Parse financial ratios from database JSON
 */
export function parseFinancialRatios(
  jsonString: string | null
): FinancialRatios {
  return safeParseJSON(
    jsonString,
    FinancialRatiosSchema,
    'FinancialRatios'
  );
}

/**
 * Safely stringify JSON for database storage
 */
export function safeStringifyJSON<T>(
  data: T,
  schema: z.ZodSchema<T>,
  context: string
): string {
  try {
    // Validate before stringifying
    const validated = schema.parse(data);
    return JSON.stringify(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(`JSON validation failed before stringify: ${context}`, {
        error: error.errors,
      });
      throw new AppError(
        500,
        `Invalid data format: ${context}`,
        ErrorCodes.VALIDATION_ERROR,
        { zodErrors: error.errors }
      );
    }
    throw error;
  }
}












