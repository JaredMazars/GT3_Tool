/**
 * URL validation utilities
 * Ensures URLs use safe protocols and are properly formatted
 * This matches the backend sanitizeUrl() validation
 */

/**
 * Allowed URL protocols
 * Only http, https, and mailto are permitted
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

/**
 * Validate URL and ensure it uses a safe protocol
 * This matches the backend sanitizeUrl() function in @/lib/utils/sanitization
 * 
 * @param url - URL string to validate
 * @returns true if valid and safe, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const trimmed = url.trim();
  
  // Must be non-empty after trim
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    
    // Check if protocol is in the allowed list
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as typeof ALLOWED_PROTOCOLS[number])) {
      return false;
    }
    
    return true;
  } catch {
    // URL parsing failed
    return false;
  }
}

/**
 * Get user-friendly error message for invalid URLs
 * 
 * @param url - URL string to validate
 * @returns Error message if invalid, null if valid
 */
export function getUrlValidationError(url: string | null | undefined): string | null {
  if (!url) {
    return 'URL is required';
  }

  const trimmed = url.trim();
  
  if (!trimmed) {
    return 'URL is required';
  }

  try {
    const parsed = new URL(trimmed);
    
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as typeof ALLOWED_PROTOCOLS[number])) {
      return `Only ${ALLOWED_PROTOCOLS.join(', ')} protocols are allowed. "${parsed.protocol}" is not permitted for security reasons.`;
    }
    
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
}


























