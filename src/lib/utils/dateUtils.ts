/**
 * Date utility functions shared across the application
 */

/**
 * Calculate number of business days (excluding weekends) between two dates
 * Uses INCLUSIVE end date model - both start and end dates are counted
 * @param startDate - First day of the period (inclusive)
 * @param endDate - Last day of the period (inclusive)
 * @returns Number of business days (Monday-Friday only)
 * @example
 * // 1st to 2nd = 2 days (both included)
 * calculateBusinessDays(new Date('2024-01-01'), new Date('2024-01-02')) // returns 2
 * // 4th to 4th = 1 day (same day)
 * calculateBusinessDays(new Date('2024-01-04'), new Date('2024-01-04')) // returns 1
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalize to start of day
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Use <= for INCLUSIVE end date (both start and end dates counted)
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate total available hours based on business days
 * 8 hours per business day (standard workday)
 * @param startDate - First day of the period (inclusive)
 * @param endDate - Last day of the period (inclusive)
 * @returns Total available hours (business days × 8)
 */
export function calculateAvailableHours(startDate: Date, endDate: Date): number {
  const businessDays = calculateBusinessDays(startDate, endDate);
  return businessDays * 8;
}

/**
 * Calculate allocation percentage from hours
 * @param allocatedHours - Hours allocated to this task
 * @param totalAvailableHours - Total available hours in the period
 * @returns Percentage (0-100+), rounded to nearest integer
 */
export function calculateAllocationPercentage(
  allocatedHours: number,
  totalAvailableHours: number
): number {
  if (totalAvailableHours === 0) return 0;
  return Math.round((allocatedHours / totalAvailableHours) * 100);
}

