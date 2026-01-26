import { validateEnvVariables } from '../utils/errorHandler';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AZURE_OPENAI_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  NODE_ENV: 'development',
  MAX_FILE_UPLOAD_SIZE: '10485760', // 10MB
  RATE_LIMIT_MAX_REQUESTS: '100',
  RATE_LIMIT_WINDOW_MS: '60000', // 1 minute
  AZURE_STORAGE_CONTAINER_NAME: 'adjustment-documents',
  AZURE_OPENAI_DEPLOYMENT: 'gpt-5-mini',
  AZURE_BING_SEARCH_ENDPOINT: 'https://api.bing.microsoft.com/v7.0/search',
  AZURE_SEARCH_INDEX_NAME: 'opinion-documents',
} as const;

/**
 * Validate all required environment variables on startup
 * Should be called when the application starts
 */
export function validateEnvironment(): void {
  try {
    validateEnvVariables(REQUIRED_ENV_VARS);
    // Environment validation successful - logger may not be initialized yet
    // so we skip logging here to avoid circular dependencies
  } catch (error) {
    // Re-throw without logging to avoid circular dependency with logger
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
 * @throws Error if variable is not set (except during build)
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  
  // During build, return empty string if not set (will validate at runtime)
  if (!value && process.env.NEXT_PHASE === 'phase-production-build') {
    return '';
  }
  
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
  
  const parsed = Number.parseInt(value, 10);
  
  return Number.isNaN(parsed) ? defaultValue : parsed;
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
  
  // Azure OpenAI (replaces direct OpenAI)
  azureOpenAiApiKey: getRequiredEnvVar('AZURE_OPENAI_API_KEY'),
  azureOpenAiDeployment: getEnvVar(
    'AZURE_OPENAI_DEPLOYMENT',
    OPTIONAL_ENV_VARS.AZURE_OPENAI_DEPLOYMENT
  ),
  
  // NextAuth
  nextAuthSecret: getRequiredEnvVar('NEXTAUTH_SECRET'),
  nextAuthUrl: getRequiredEnvVar('NEXTAUTH_URL'),
  
  // Azure AD
  azureAdClientId: getRequiredEnvVar('AZURE_AD_CLIENT_ID'),
  azureAdClientSecret: getRequiredEnvVar('AZURE_AD_CLIENT_SECRET'),
  azureAdTenantId: getRequiredEnvVar('AZURE_AD_TENANT_ID'),
  
  // Azure Blob Storage (optional - falls back to local storage if not set)
  azureStorageConnectionString: getEnvVar('AZURE_STORAGE_CONNECTION_STRING'),
  azureStorageContainerName: getEnvVar(
    'AZURE_STORAGE_CONTAINER_NAME',
    OPTIONAL_ENV_VARS.AZURE_STORAGE_CONTAINER_NAME
  ),
  
  // File uploads
  maxFileUploadSize: getEnvVarAsNumber(
    'MAX_FILE_UPLOAD_SIZE',
    Number.parseInt(OPTIONAL_ENV_VARS.MAX_FILE_UPLOAD_SIZE, 10)
  ),
  
  // Rate limiting
  rateLimitMaxRequests: getEnvVarAsNumber(
    'RATE_LIMIT_MAX_REQUESTS',
    Number.parseInt(OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS, 10)
  ),
  rateLimitWindowMs: getEnvVarAsNumber(
    'RATE_LIMIT_WINDOW_MS',
    Number.parseInt(OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS, 10)
  ),
  
  // Azure Communication Services (Email) - Optional
  azureCommunicationConnectionString: getEnvVar('AZURE_COMMUNICATION_CONNECTION_STRING'),
  emailFromAddress: getEnvVar('EMAIL_FROM_ADDRESS'),
  
  // Bing Search (optional)
  azureBingSearchApiKey: getEnvVar('AZURE_BING_SEARCH_API_KEY'),
  azureBingSearchEndpoint: getEnvVar(
    'AZURE_BING_SEARCH_ENDPOINT',
    OPTIONAL_ENV_VARS.AZURE_BING_SEARCH_ENDPOINT
  ),
  
  // Azure AI Search (optional - for RAG/document search in tax opinions)
  azureSearchEndpoint: getEnvVar('AZURE_SEARCH_ENDPOINT'),
  azureSearchApiKey: getEnvVar('AZURE_SEARCH_API_KEY'),
  azureSearchIndexName: getEnvVar(
    'AZURE_SEARCH_INDEX_NAME',
    OPTIONAL_ENV_VARS.AZURE_SEARCH_INDEX_NAME
  ),

  // Azure AI Foundry Agent Service (optional - for Grounding with Bing Search)
  // Uses Azure AD authentication via DefaultAzureCredential (no API key needed)
  azureAIFoundryEndpoint: getEnvVar('AZURE_EXISTING_AIPROJECT_ENDPOINT'),
  azureAIAgentId: getEnvVar('AZURE_EXISTING_AGENT_ID'),
  // Bing connection ID for grounding - format: /subscriptions/.../connections/<connection_name>
  azureBingConnectionId: getEnvVar('AZURE_BING_CONNECTION_ID'),
} as const;






















