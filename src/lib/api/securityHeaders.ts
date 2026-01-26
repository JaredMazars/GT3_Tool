/**
 * Security Headers Configuration
 * 
 * Constants for HTTP security headers applied to all responses.
 * These headers help protect against common web vulnerabilities.
 */

/**
 * Core security headers applied to all responses
 */
export const SECURITY_HEADERS = {
  /**
   * Prevents MIME type sniffing
   * Browsers should use the declared Content-Type and not try to detect it
   */
  'X-Content-Type-Options': 'nosniff',
  
  /**
   * Prevents the page from being embedded in iframes
   * Protects against clickjacking attacks
   */
  'X-Frame-Options': 'DENY',
  
  /**
   * Enables XSS filtering in older browsers
   * Modern browsers have this built-in but this helps legacy support
   */
  'X-XSS-Protection': '1; mode=block',
  
  /**
   * Controls what information is sent in the Referer header
   * Only sends origin for cross-origin requests, full URL for same-origin
   */
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  /**
   * Restricts browser features that can be used
   * Disables camera, microphone, geolocation, and payment APIs
   */
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  
  /**
   * Prevents caching of sensitive data
   * Important for authenticated responses
   */
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  
  /**
   * Legacy cache control header for older browsers
   */
  'Pragma': 'no-cache',
} as const;

/**
 * Content Security Policy directives
 * 
 * Note: CSP is intentionally flexible to avoid breaking existing functionality.
 * This can be tightened based on specific application needs.
 */
export const CSP_DIRECTIVES = {
  /** Default source for all content types */
  'default-src': ["'self'"],
  
  /** Script sources */
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  
  /** Style sources */
  'style-src': ["'self'", "'unsafe-inline'"],
  
  /** Image sources */
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  
  /** Font sources */
  'font-src': ["'self'", 'data:'],
  
  /** Object/embed sources */
  'object-src': ["'none'"],
  
  /** Base URI restriction */
  'base-uri': ["'self'"],
  
  /** Form action targets */
  'form-action': ["'self'"],
  
  /** Frame ancestors (alternative to X-Frame-Options) */
  'frame-ancestors': ["'none'"],
  
  /** Connect sources for AJAX, WebSocket, etc. */
  'connect-src': [
    "'self'",
    'https://login.microsoftonline.com',
    'https://*.azure.com',
    'https://*.windows.net',
  ],
  
  /** Worker sources */
  'worker-src': ["'self'", 'blob:'],
} as const;

/**
 * Build CSP header value from directives
 */
export function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Get all security headers including CSP
 * 
 * @param includeCSP - Whether to include Content-Security-Policy header
 * @returns Record of header name to header value
 */
export function getSecurityHeaders(includeCSP = false): Record<string, string> {
  const headers: Record<string, string> = { ...SECURITY_HEADERS };
  
  if (includeCSP) {
    headers['Content-Security-Policy'] = buildCSPHeader();
  }
  
  return headers;
}

/**
 * Headers that should NOT be cached (for authenticated content)
 */
export const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const;

/**
 * Headers for cacheable static content
 * 
 * @param maxAge - Max age in seconds (default: 1 hour)
 */
export function getCacheHeaders(maxAge = 3600): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
  };
}

/**
 * CORS headers for API responses
 * 
 * Note: In production, origin should be restricted to specific domains
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
} as const;

/**
 * Get CORS headers with specific origin
 * 
 * @param origin - Allowed origin (use '*' with caution)
 */
export function getCORSHeaders(origin: string): Record<string, string> {
  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Apply security headers to a Response or Headers object
 * 
 * @param target - Response or Headers object
 * @param includeCSP - Whether to include CSP header
 */
export function applySecurityHeaders(
  target: Response | Headers,
  includeCSP = false
): void {
  const headers = target instanceof Response ? target.headers : target;
  const securityHeaders = getSecurityHeaders(includeCSP);
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}
