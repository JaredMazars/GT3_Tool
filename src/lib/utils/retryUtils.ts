import { AppError, ErrorCodes } from './errorHandler';
import { logWarn, logError, logInfo } from './logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: any) => boolean;
}

/**
 * Default retry configurations
 */
export const RetryPresets = {
  // For AI API calls (OpenAI, etc.)
  AI_API: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: (error: any) => {
      // Retry on rate limits, timeouts, and 5xx errors
      if (error?.status) {
        return error.status === 429 || error.status >= 500;
      }
      // Retry on network errors
      if (error?.code) {
        return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
      }
      return false;
    },
  },
  
  // For external API calls
  EXTERNAL_API: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: (error: any) => {
      return error?.status >= 500 || error?.code === 'ECONNRESET';
    },
  },
  
  // For database operations
  DATABASE: {
    maxRetries: 2,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: (error: any) => {
      // Retry on deadlock or connection errors
      return error?.code === 'P2034' || error?.code === 'P1001';
    },
  },
  
  // For Azure SQL Database (handles cold-start scenarios)
  AZURE_SQL_COLD_START: {
    maxRetries: 3,
    initialDelayMs: 5000, // Longer initial delay for cold start
    maxDelayMs: 30000, // Allow up to 30s for cold start
    backoffMultiplier: 2,
    retryableErrors: (error: any) => {
      // P1001: Can't reach database server
      // P1017: Server closed connection
      // P2024: Timed out fetching from data source
      // P1008: Operations timed out
      if (error?.code) {
        return ['P1001', 'P1017', 'P2024', 'P1008'].includes(error.code);
      }
      // Also retry on connection-related error messages
      if (error?.message) {
        const message = error.message.toLowerCase();
        return message.includes('timeout') || 
               message.includes('connect') ||
               message.includes('connection') ||
               message.includes('econnreset');
      }
      return false;
    },
  },
} as const;

/**
 * Calculate delay for exponential backoff
 * @param attemptNumber - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(attemptNumber: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on configuration
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns True if error is retryable
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  if (config.retryableErrors) {
    return config.retryableErrors(error);
  }
  
  // Default: retry on 5xx errors and network errors
  if (error?.status >= 500) {
    return true;
  }
  
  if (error?.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
    return true;
  }
  
  return false;
}

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param context - Optional context for logging
 * @returns Result of the function
 * @throws Last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RetryPresets.AI_API,
  context?: string
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // Log successful retry
      if (attempt > 0 && context) {
        logInfo(`Succeeded after ${attempt} retries`, { context });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = attempt < config.maxRetries && isRetryableError(error, config);
      
      if (!shouldRetry) {
        // Log final failure
        if (context) {
          logError(`Failed after ${attempt + 1} attempts`, error, { context });
        }
        throw error;
      }
      
      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config);
      
      if (context) {
        logWarn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`, {
          context,
          error: (error as Error)?.message || String(error),
          attempt: attempt + 1,
          delay
        });
      }
      
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

// Store circuit breaker states
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Circuit breaker implementation
 * Prevents cascading failures by failing fast when a service is down
 * 
 * @param key - Unique identifier for the circuit
 * @param fn - Function to execute
 * @param config - Circuit breaker configuration
 * @returns Result of the function
 * @throws AppError if circuit is open
 */
export async function withCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  config: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenRequests: 1,
  }
): Promise<T> {
  let state = circuitBreakers.get(key) || {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed' as const,
  };
  
  const now = Date.now();
  
  // Check if we should transition from open to half-open
  if (state.state === 'open' && now - state.lastFailureTime >= config.resetTimeoutMs) {
    state.state = 'half-open';
    logInfo(`Circuit breaker transitioning to half-open state`, { circuitBreaker: key });
  }
  
  // Fail fast if circuit is open
  if (state.state === 'open') {
    throw new AppError(
      503,
      'Service temporarily unavailable due to repeated failures',
      ErrorCodes.EXTERNAL_API_ERROR,
      { circuitBreaker: key, state: 'open' }
    );
  }
  
  try {
    const result = await fn();
    
    // Success - reset circuit breaker
    if (state.failures > 0) {
      logInfo(`Circuit breaker: service recovered, closing circuit`, { circuitBreaker: key });
    }
    
    state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
    circuitBreakers.set(key, state);
    
    return result;
  } catch (error) {
    // Record failure
    state.failures++;
    state.lastFailureTime = now;
    
    // Open circuit if threshold is reached
    if (state.failures >= config.failureThreshold) {
      state.state = 'open';
      logError(`Circuit breaker opening after ${state.failures} failures`, error, {
        circuitBreaker: key,
        failures: state.failures,
        threshold: config.failureThreshold
      });
    }
    
    circuitBreakers.set(key, state);
    throw error;
  }
}

/**
 * Reset a circuit breaker manually
 * @param key - Circuit breaker key
 */
export function resetCircuitBreaker(key: string): void {
  circuitBreakers.delete(key);
  logInfo(`Circuit breaker manually reset`, { circuitBreaker: key });
}

/**
 * Get circuit breaker status
 * @param key - Circuit breaker key
 * @returns Current circuit breaker state or null
 */
export function getCircuitBreakerStatus(key: string): CircuitBreakerState | null {
  return circuitBreakers.get(key) || null;
}

/**
 * Combine retry logic with circuit breaker
 * 
 * @param key - Circuit breaker key
 * @param fn - Function to execute
 * @param retryConfig - Retry configuration
 * @param circuitConfig - Circuit breaker configuration
 * @param context - Optional context for logging
 * @returns Result of the function
 */
export async function withRetryAndCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  retryConfig: RetryConfig = RetryPresets.AI_API,
  circuitConfig?: CircuitBreakerConfig,
  context?: string
): Promise<T> {
  return withCircuitBreaker(
    key,
    () => withRetry(fn, retryConfig, context),
    circuitConfig
  );
}

