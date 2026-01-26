/**
 * Document Vault Cache Management
 * Handles caching and invalidation for vault documents
 */

import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { logger } from '@/lib/utils/logger';

// Add document vault cache prefix
export const DOCUMENT_VAULT_CACHE_PREFIX = 'document:vault';

// Cache TTLs
const DOCUMENT_LIST_TTL = 30 * 60; // 30 minutes
const DOCUMENT_DETAIL_TTL = 30 * 60; // 30 minutes
const CATEGORIES_TTL = 30 * 60; // 30 minutes
const SEARCH_TTL = 5 * 60; // 5 minutes

/**
 * Generate cache key for document list
 */
export function getDocumentListCacheKey(filters: {
  scope?: string;
  serviceLine?: string;
  categoryId?: number;
  documentType?: string;
  status?: string;
}): string {
  const parts = [DOCUMENT_VAULT_CACHE_PREFIX, 'list'];
  
  if (filters.scope) parts.push(`scope:${filters.scope}`);
  if (filters.serviceLine) parts.push(`sl:${filters.serviceLine}`);
  if (filters.categoryId) parts.push(`cat:${filters.categoryId}`);
  if (filters.documentType) parts.push(`type:${filters.documentType}`);
  if (filters.status) parts.push(`status:${filters.status}`);
  
  return parts.join(':');
}

/**
 * Generate cache key for document detail
 */
export function getDocumentDetailCacheKey(documentId: number): string {
  return `${DOCUMENT_VAULT_CACHE_PREFIX}:doc:${documentId}`;
}

/**
 * Generate cache key for categories
 */
export function getCategoriesCacheKey(): string {
  return `${DOCUMENT_VAULT_CACHE_PREFIX}:categories`;
}

/**
 * Generate cache key for search results
 */
export function getSearchCacheKey(query: string): string {
  // Normalize query for cache key
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '-');
  return `${DOCUMENT_VAULT_CACHE_PREFIX}:search:${normalizedQuery}`;
}

/**
 * Cache document list
 */
export async function cacheDocumentList(
  filters: {
    scope?: string;
    serviceLine?: string;
    categoryId?: number;
    documentType?: string;
    status?: string;
  },
  data: any
): Promise<void> {
  try {
    const cacheKey = getDocumentListCacheKey(filters);
    await cache.set(cacheKey, data, DOCUMENT_LIST_TTL);
    logger.debug('Cached document list', { cacheKey });
  } catch (error) {
    logger.error('Failed to cache document list', { error });
  }
}

/**
 * Get cached document list
 */
export async function getCachedDocumentList(filters: {
  scope?: string;
  serviceLine?: string;
  categoryId?: number;
  documentType?: string;
  status?: string;
}): Promise<any | null> {
  try {
    const cacheKey = getDocumentListCacheKey(filters);
    return await cache.get(cacheKey);
  } catch (error) {
    logger.error('Failed to get cached document list', { error });
    return null;
  }
}

/**
 * Cache document detail
 */
export async function cacheDocumentDetail(
  documentId: number,
  data: any
): Promise<void> {
  try {
    const cacheKey = getDocumentDetailCacheKey(documentId);
    await cache.set(cacheKey, data, DOCUMENT_DETAIL_TTL);
    logger.debug('Cached document detail', { documentId });
  } catch (error) {
    logger.error('Failed to cache document detail', { error });
  }
}

/**
 * Get cached document detail
 */
export async function getCachedDocumentDetail(
  documentId: number
): Promise<any | null> {
  try {
    const cacheKey = getDocumentDetailCacheKey(documentId);
    return await cache.get(cacheKey);
  } catch (error) {
    logger.error('Failed to get cached document detail', { error });
    return null;
  }
}

/**
 * Cache categories
 */
export async function cacheCategories(data: any): Promise<void> {
  try {
    const cacheKey = getCategoriesCacheKey();
    await cache.set(cacheKey, data, CATEGORIES_TTL);
    logger.debug('Cached document categories');
  } catch (error) {
    logger.error('Failed to cache categories', { error });
  }
}

/**
 * Get cached categories
 */
export async function getCachedCategories(): Promise<any | null> {
  try {
    const cacheKey = getCategoriesCacheKey();
    return await cache.get(cacheKey);
  } catch (error) {
    logger.error('Failed to get cached categories', { error });
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  query: string,
  data: any
): Promise<void> {
  try {
    const cacheKey = getSearchCacheKey(query);
    await cache.set(cacheKey, data, SEARCH_TTL);
    logger.debug('Cached search results', { query });
  } catch (error) {
    logger.error('Failed to cache search results', { error });
  }
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  query: string
): Promise<any | null> {
  try {
    const cacheKey = getSearchCacheKey(query);
    return await cache.get(cacheKey);
  } catch (error) {
    logger.error('Failed to get cached search results', { error });
    return null;
  }
}

/**
 * Invalidate document vault cache after document mutation
 * Call this after: create, update, publish, archive operations
 */
export async function invalidateDocumentVaultCache(
  documentId: number,
  serviceLine?: string
): Promise<void> {
  try {
    // Invalidate specific document detail
    const detailKey = getDocumentDetailCacheKey(documentId);
    await cache.delete(detailKey);

    // Invalidate all document lists (they may contain this document)
    await cache.invalidatePattern(`${DOCUMENT_VAULT_CACHE_PREFIX}:list:*`);

    // Invalidate search results (they may contain this document)
    await cache.invalidatePattern(`${DOCUMENT_VAULT_CACHE_PREFIX}:search:*`);

    logger.info('Invalidated document vault cache', { documentId, serviceLine });
  } catch (error) {
    logger.error('Failed to invalidate document vault cache', { error });
  }
}

/**
 * Invalidate all categories cache
 * Call this after: create, update, delete category operations
 */
export async function invalidateCategoriesCache(): Promise<void> {
  try {
    const cacheKey = getCategoriesCacheKey();
    await cache.delete(cacheKey);
    logger.info('Invalidated categories cache');
  } catch (error) {
    logger.error('Failed to invalidate categories cache', { error });
  }
}

/**
 * Generate cache key for document types (active only)
 */
export function getDocumentTypesActiveCacheKey(): string {
  return `${DOCUMENT_VAULT_CACHE_PREFIX}:types:active`;
}

/**
 * Generate cache key for all document types (including inactive)
 */
export function getDocumentTypesAllCacheKey(): string {
  return `${DOCUMENT_VAULT_CACHE_PREFIX}:types:all`;
}

/**
 * Invalidate document types cache
 * Call this after: create, update, delete document type operations
 */
export async function invalidateDocumentTypesCache(): Promise<void> {
  try {
    await Promise.all([
      cache.delete(getDocumentTypesActiveCacheKey()),
      cache.delete(getDocumentTypesAllCacheKey()),
    ]);
    logger.info('Invalidated document types cache');
  } catch (error) {
    logger.error('Failed to invalidate document types cache', { error });
  }
}

/**
 * Clear all document vault cache
 * Use sparingly - only for major changes
 */
export async function clearDocumentVaultCache(): Promise<void> {
  try {
    await cache.invalidatePattern(`${DOCUMENT_VAULT_CACHE_PREFIX}:*`);
    logger.info('Cleared all document vault cache');
  } catch (error) {
    logger.error('Failed to clear document vault cache', { error });
  }
}
