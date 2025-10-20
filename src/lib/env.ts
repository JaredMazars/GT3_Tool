import { validateEnvVariables } from './errorHandler';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  NODE_ENV: 'development',
  MAX_FILE_UPLOAD_SIZE: '10485760', // 10MB
  RATE_LIMIT_MAX_REQUESTS: '10',
  RATE_LIMIT_WINDOW_MS: '60000', // 1 minute
} as const;

/**
 * Validate all required environment variables on startup
 * Should be called when the application starts
 */
export function validateEnvironment(): void {
  try {
    validateEnvVariables(REQUIRED_ENV_VARS);
    console.log('✓ Environment variables validated successfully');
  } catch (error) {
    console.error('✗ Environment validation failed:', error);
    throw error;
  }
}

/**
 * Get environment variable with fallback to default
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

/**
 * Get required environment variable or throw error
 * @param key - Environment variable key
 * @returns Environment variable value
 * @throws Error if variable is not set
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value;
}

/**
 * Get environment variable as number
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set or invalid
 * @returns Parsed number or default
 */
export function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable as boolean
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Boolean value
 */
export function getEnvVarAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in production
 * @returns True if NODE_ENV is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 * @returns True if NODE_ENV is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test environment
 * @returns True if NODE_ENV is test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Environment configuration object
 * Provides type-safe access to environment variables
 */
export const env = {
  // Node environment
  nodeEnv: getEnvVar('NODE_ENV', OPTIONAL_ENV_VARS.NODE_ENV),
  isProduction: isProduction(),
  isDevelopment: isDevelopment(),
  isTest: isTest(),
  
  // Database
  databaseUrl: getRequiredEnvVar('DATABASE_URL'),
  
  // OpenAI
  openaiApiKey: getRequiredEnvVar('OPENAI_API_KEY'),
  
  // File uploads
  maxFileUploadSize: getEnvVarAsNumber(
    'MAX_FILE_UPLOAD_SIZE',
    parseInt(OPTIONAL_ENV_VARS.MAX_FILE_UPLOAD_SIZE, 10)
  ),
  
  // Rate limiting
  rateLimitMaxRequests: getEnvVarAsNumber(
    'RATE_LIMIT_MAX_REQUESTS',
    parseInt(OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS, 10)
  ),
  rateLimitWindowMs: getEnvVarAsNumber(
    'RATE_LIMIT_WINDOW_MS',
    parseInt(OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS, 10)
  ),
} as const;



