/**
 * Extract employee code from various userId formats
 * Handles:
 * - pending-EMPCODE (e.g., "pending-DM")
 * - emp_EMPCODE_timestamp (e.g., "emp_SOOA002_1765469537556")
 * - Direct employee codes (e.g., "DM", "SOOA002")
 * - Email addresses (returns null, needs email lookup)
 */
export function extractEmpCodeFromUserId(userId: string): string | null {
  if (!userId) return null;

  // Pattern 1: pending-EMPCODE
  if (userId.startsWith('pending-')) {
    const empCode = userId.replace('pending-', '');
    return empCode.length > 0 ? empCode : null;
  }

  // Pattern 2: emp_EMPCODE_timestamp
  if (userId.startsWith('emp_')) {
    const parts = userId.split('_');
    if (parts.length >= 2) {
      const empCode = parts[1];
      return empCode && empCode.length > 0 ? empCode : null;
    }
  }

  // Pattern 3: Email addresses - return null (need email-based lookup)
  if (userId.includes('@')) {
    return null;
  }

  // Pattern 4: Direct employee code (short alphanumeric strings)
  // Employee codes are typically 2-10 characters, all caps or mixed case
  // Examples: "DM", "SOOA002", "ABC123"
  if (userId.length >= 2 && userId.length <= 10 && /^[A-Za-z0-9]+$/.test(userId)) {
    return userId.toUpperCase();
  }

  return null;
}

/**
 * Extract email prefix (username part before @)
 */
export function extractEmailPrefix(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  const prefix = email.split('@')[0];
  return prefix && prefix.length > 0 ? prefix.toLowerCase() : null;
}

/**
 * Generate email variants for matching
 * Returns array of possible email addresses
 */
export function generateEmailVariants(email: string): string[] {
  if (!email) return [];
  
  const variants: string[] = [email.toLowerCase()];
  const prefix = extractEmailPrefix(email);
  
  if (prefix) {
    // Add common domain variants
    variants.push(`${prefix}@forvismazars.com`);
    variants.push(`${prefix}@mazarsinafrica.onmicrosoft.com`);
    variants.push(`${prefix}@forvismazars.us`);
    variants.push(`${prefix}@forvismazars.co.za`);
  }
  
  // Remove duplicates
  return [...new Set(variants)];
}

