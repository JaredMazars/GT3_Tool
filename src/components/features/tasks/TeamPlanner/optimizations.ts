/**
 * Performance optimization utilities for TeamPlanner
 * 
 * This module provides memoized calculations and debounced handlers
 * to improve rendering performance and reduce unnecessary computation.
 */

import { AllocationData } from './types';

/**
 * Simple memoization cache
 */
const memoCache = new Map<string, any>();

/**
 * Generic memoization function with custom key generator
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    if (memoCache.has(key)) {
      return memoCache.get(key);
    }
    
    const result = fn(...args);
    memoCache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (memoCache.size > 1000) {
      const firstKey = memoCache.keys().next().value;
      if (firstKey !== undefined) {
        memoCache.delete(firstKey);
      }
    }
    
    return result;
  }) as T;
}

/**
 * Calculate total hours from allocations with memoization
 */
export const memoizedCalculateTotalHours = memoize(
  (allocations: AllocationData[]): number => {
    return allocations.reduce((total, allocation) => {
      return total + (allocation.allocatedHours || 0);
    }, 0);
  },
  (allocations) => allocations.map(a => `${a.id}-${a.allocatedHours}`).join(',')
);

/**
 * Calculate total percentage from allocations with memoization
 */
export const memoizedCalculateTotalPercentage = memoize(
  (allocations: AllocationData[]): number => {
    return allocations.reduce((total, allocation) => {
      return total + (allocation.allocatedPercentage || 0);
    }, 0);
  },
  (allocations) => allocations.map(a => `${a.id}-${a.allocatedPercentage}`).join(',')
);

/**
 * Debounce function for event handlers
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds (default: 16ms for ~60fps)
 * @param options - Debounce options
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 16,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let hasInvoked = false;

  return function debounced(...args: Parameters<T>) {
    lastArgs = args;

    // Leading edge execution
    if (options.leading && !hasInvoked) {
      func(...args);
      hasInvoked = true;
    }

    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for trailing edge
    if (options.trailing) {
      timeoutId = setTimeout(() => {
        if (lastArgs !== null) {
          func(...lastArgs);
        }
        hasInvoked = false;
        timeoutId = null;
        lastArgs = null;
      }, delay);
    }
  };
}

/**
 * Throttle function for high-frequency event handlers
 * 
 * @param func - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 16
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>) {
    lastArgs = args;

    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        // Call with last args if there were additional calls during throttle
        if (lastArgs !== null && lastArgs !== args) {
          func(...lastArgs);
        }
      }, limit);
    }
  };
}

/**
 * Clear memoization cache
 * Useful for testing or when data changes significantly
 */
export function clearMemoCache(): void {
  memoCache.clear();
}

/**
 * Get memoization cache size
 * Useful for monitoring memory usage
 */
export function getMemoCacheSize(): number {
  return memoCache.size;
}
