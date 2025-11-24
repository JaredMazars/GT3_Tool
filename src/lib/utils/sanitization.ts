/**
 * Input sanitization utilities
 * Protects against XSS and injection attacks
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * This is a server-side sanitization for database storage
 * 
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export interface SanitizeOptions {
  /** Allow newlines in the input */
  allowNewlines?: boolean;
  /** Allow HTML tags (escaped) */
  allowHTML?: boolean;
  /** Maximum length */
  maxLength?: number;
}

/**
 * Sanitize text input
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeText(input: string | null | undefined, options: SanitizeOptions = {}): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  const {
    allowNewlines = true,
    allowHTML = false,
    maxLength,
  } = options;

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  } else {
    // Keep newlines and tabs, remove other control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Escape HTML if not allowed
  if (!allowHTML) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 * Validates basic email format and removes dangerous characters
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  // Remove whitespace
  let sanitized = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize URL
 * Ensures URL is safe and valid
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Only allow http, https, and mailto protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  
  try {
    const parsed = new URL(trimmed);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, return null
    return null;
  }
}

/**
 * Sanitize number input
 * Ensures the input is a valid number
 */
export function sanitizeNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Sanitize integer input
 * Ensures the input is a valid integer
 */
export function sanitizeInteger(input: unknown): number | null {
  const num = sanitizeNumber(input);
  if (num === null) return null;

  if (!Number.isInteger(num)) {
    return Math.floor(num);
  }

  return num;
}

/**
 * Sanitize file path
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilePath(path: string | null | undefined): string | null {
  if (!path) return null;

  let sanitized = path.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/~\//g, '');
  
  // Remove leading slashes to prevent absolute paths
  sanitized = sanitized.replace(/^\/+/, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Only allow alphanumeric, dash, underscore, dot, and forward slash
  sanitized = sanitized.replace(/[^a-zA-Z0-9._/-]/g, '');

  return sanitized || null;
}

/**
 * Sanitize object with multiple fields
 * Applies appropriate sanitization to each field based on field name patterns
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }

    // Apply field-specific sanitization based on field name
    if (key.toLowerCase().includes('email')) {
      sanitized[key] = sanitizeEmail(value);
    } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
      sanitized[key] = sanitizeUrl(value);
    } else if (key.toLowerCase().includes('path')) {
      sanitized[key] = sanitizeFilePath(value);
    } else if (typeof value === 'string') {
      // Default string sanitization
      const allowHTML = key.toLowerCase().includes('description') || 
                       key.toLowerCase().includes('content') ||
                       key.toLowerCase().includes('notes');
      sanitized[key] = sanitizeText(value, { ...options, allowHTML });
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}





