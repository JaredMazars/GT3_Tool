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

  // Limit email length to prevent ReDoS
  if (sanitized.length > 320) { // Max email length per RFC 5321
    return null;
  }

  // Safe email validation regex with explicit length limits
  // Split into parts to avoid nested quantifiers
  const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/;
  const domainLabelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  // Split and validate email parts separately
  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return null;
  }

  const localPart = parts[0];
  const domain = parts[1];

  // Validate local part
  if (!localPart || !localPartRegex.test(localPart)) {
    return null;
  }

  // Validate domain
  if (!domain) {
    return null;
  }

  const domainLabels = domain.split('.');
  if (domainLabels.length < 2 || domainLabels.length > 127) {
    return null;
  }

  for (const label of domainLabels) {
    if (!label || !domainLabelRegex.test(label) || label.length > 63) {
      return null;
    }
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
  if (Number.isNaN(num) || !isFinite(num)) {
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
 * Sanitize comment or user input field
 * Specifically designed for questionnaire comments and user-generated content
 * Removes potentially dangerous characters while preserving readability
 * 
 * @param comment - Comment string to sanitize
 * @returns Sanitized comment or undefined
 */
export function sanitizeComment(comment: string | undefined | null): string | undefined {
  if (!comment) return undefined;

  let sanitized = comment.trim();

  // Check if empty after trim
  if (sanitized.length === 0) return undefined;

  // Limit length to prevent abuse
  const MAX_COMMENT_LENGTH = 5000;
  if (sanitized.length > MAX_COMMENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_COMMENT_LENGTH);
  }

  // Remove script tags and their content (non-greedy with length limit to prevent ReDoS)
  // Process in chunks to avoid catastrophic backtracking
  sanitized = sanitized.replace(/<script[^>]{0,200}?>[\s\S]{0,5000}?<\/script>/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove event handlers (onclick, onload, etc.) with length limit
  sanitized = sanitized.replace(/on\w{0,20}\s*=/gi, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove most control characters but keep newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Final trim
  sanitized = sanitized.trim();

  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Sanitize filename for safe storage
 * Removes path traversal and dangerous characters
 * 
 * @param filename - Original filename
 * @param maxLength - Maximum filename length (default: 255)
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  let sanitized = filename.trim();

  // Remove path separators and traversal attempts
  sanitized = sanitized.replace(/[/\\]/g, '_');
  sanitized = sanitized.replace(/\.\./g, '_');

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Only allow alphanumeric, dash, underscore, and dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.substring(1);
  }

  // Apply max length
  if (sanitized.length > maxLength) {
    // Preserve file extension if present
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > 0 && lastDot > sanitized.length - 10) {
      const ext = sanitized.substring(lastDot);
      const name = sanitized.substring(0, maxLength - ext.length);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  return sanitized || 'unnamed_file';
}

/**
 * Sanitize object with multiple fields
 * Applies appropriate sanitization to each field based on field name patterns
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }

    // Apply field-specific sanitization based on field name
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      sanitized[key] = sanitizeEmail(value);
    } else if ((key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) && typeof value === 'string') {
      sanitized[key] = sanitizeUrl(value);
    } else if (key.toLowerCase() === 'pathname' && typeof value === 'string') {
      // Pathname (URL paths) should not be sanitized - they're validated by Zod regex
      // Sanitization would escape slashes which breaks the validation
      sanitized[key] = value;
    } else if (key.toLowerCase().includes('path') && typeof value === 'string') {
      // Filesystem paths need sanitization
      sanitized[key] = sanitizeFilePath(value);
    } else if (key.toLowerCase().includes('comment') && typeof value === 'string') {
      sanitized[key] = sanitizeComment(value);
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
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}







