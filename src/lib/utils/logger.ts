import winston from 'winston';
import { env } from '../config/env';

/**
 * Log levels:
 * - error: 0
 * - warn: 1
 * - info: 2
 * - http: 3
 * - debug: 4
 */

// Define custom format
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

/**
 * Create Winston logger instance
 */
const createLogger = () => {
  // Console transport for all environments
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      customFormat
    ),
  });

  // File transports for production
  const fileErrorTransport = new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  });

  const fileCombinedTransport = new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  });

  // Determine log level based on environment
  const level = env.isDevelopment ? 'debug' : 'info';

  // Create logger with appropriate transports
  const transports: winston.transport[] = [consoleTransport];
  
  if (env.isProduction) {
    transports.push(fileErrorTransport, fileCombinedTransport);
  }

  return winston.createLogger({
    level,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
  });
};

// Export singleton logger instance
export const logger = createLogger();

/**
 * Structured logging helpers
 */

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
  if (error instanceof Error) {
    logger.error(message, {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  } else {
    logger.error(message, { ...meta, error });
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

/**
 * Log API request
 */
export const logApiRequest = (
  method: string,
  path: string,
  meta?: Record<string, unknown>
) => {
  logger.http(`${method} ${path}`, meta);
};

/**
 * Log API response
 */
export const logApiResponse = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  meta?: Record<string, unknown>
) => {
  logger.http(`${method} ${path} ${statusCode} ${duration}ms`, meta);
};

/**
 * Log database query
 */
export const logDatabaseQuery = (
  query: string,
  duration?: number,
  meta?: Record<string, unknown>
) => {
  logger.debug(`Database query: ${query}`, { ...meta, duration });
};

/**
 * Log external API call
 */
export const logExternalApiCall = (
  service: string,
  endpoint: string,
  duration?: number,
  meta?: Record<string, unknown>
) => {
  logger.debug(`External API call: ${service} ${endpoint}`, { ...meta, duration });
};

/**
 * Log AI operation
 */
export const logAiOperation = (
  operation: string,
  model: string,
  tokens?: number,
  duration?: number,
  meta?: Record<string, unknown>
) => {
  logger.info(`AI operation: ${operation}`, {
    ...meta,
    model,
    tokens,
    duration,
  });
};

/**
 * Log file operation
 */
export const logFileOperation = (
  operation: string,
  fileName: string,
  fileSize?: number,
  meta?: Record<string, unknown>
) => {
  logger.info(`File operation: ${operation}`, {
    ...meta,
    fileName,
    fileSize,
  });
};

/**
 * Log security event
 */
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  meta?: Record<string, unknown>
) => {
  logger.warn(`Security event: ${event}`, { ...meta, severity });
};

/**
 * Create child logger with context
 * Useful for adding consistent metadata to all logs in a specific context
 */
export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

// Log unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any) => {
  logError('Unhandled Promise Rejection', reason);
});

// Log uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  // Give logger time to write before exiting
  setTimeout(() => process.exit(1), 1000);
});

export default logger;














































