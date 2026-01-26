/**
 * List Cache Service
 * 
 * Provides caching functionality specifically for list endpoints
 * with support for pagination, filtering, and search parameters.
 */

import { cache, CACHE_PREFIXES } from './CacheService';

// TTL for list data: 5 minutes (300 seconds)
const LIST_CACHE_TTL = 5 * 60;

// Maximum number of pages to cache per query
const MAX_CACHED_PAGES = 3;

interface ListCacheParams {
  endpoint: 'clients' | 'tasks' | 'groups';
  page?: number;
  limit?: number;
  serviceLine?: string;
  subServiceLineGroup?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
  internalOnly?: boolean;
  clientTasksOnly?: boolean;
  myTasksOnly?: boolean;
  groupCode?: string;
  type?: 'clients' | 'tasks';
  clientCode?: string;
  status?: string;
}

/**
 * Generate a cache key for list queries
 */
export function getListCacheKey(params: ListCacheParams): string {
  const {
    endpoint,
    page = 1,
    limit = 50,
    serviceLine,
    subServiceLineGroup,
    search,
    sortBy,
    sortOrder,
    includeArchived,
    internalOnly,
    clientTasksOnly,
    myTasksOnly,
    groupCode,
    type,
    clientCode,
    status,
  } = params;

  // Build key components
  let prefix: string;
  if (endpoint === 'clients') {
    prefix = CACHE_PREFIXES.CLIENT;
  } else if (endpoint === 'tasks') {
    prefix = CACHE_PREFIXES.TASK;
  } else {
    prefix = CACHE_PREFIXES.CLIENT; // Groups use client prefix
  }
  
  const components: string[] = [
    prefix,
    endpoint === 'groups' ? 'groups' : 'list',
    `p${page}`,
    `l${limit}`,
  ];

  // Add optional filters
  if (serviceLine) components.push(`sl${serviceLine}`);
  if (subServiceLineGroup) components.push(`sg${subServiceLineGroup}`);
  if (search) components.push(`s${search}`);
  if (sortBy) components.push(`sb${sortBy}`);
  if (sortOrder) components.push(`so${sortOrder}`);
  if (includeArchived) components.push('arch');
  if (internalOnly) components.push('int');
  if (clientTasksOnly) components.push('client');
  if (myTasksOnly) components.push('my');
  if (groupCode) components.push(`gc${groupCode}`);
  if (type) components.push(`t${type}`);
  if (clientCode) components.push(`cc${clientCode}`);
  if (status) components.push(`st${status}`);

  return components.join(':');
}

/**
 * Get cached list data
 */
export async function getCachedList<T>(params: ListCacheParams): Promise<T | null> {
  const { page = 1, search } = params;

  // Skip cache for searches (too many permutations)
  if (search && search.length > 0) {
    return null;
  }

  // Only cache first few pages
  if (page > MAX_CACHED_PAGES) {
    return null;
  }

  const cacheKey = getListCacheKey(params);
  
  const result = await cache.get<T>(cacheKey);
  
  return result;
}

/**
 * Set cached list data
 */
export async function setCachedList<T>(
  params: ListCacheParams,
  data: T
): Promise<void> {
  const { page = 1, search } = params;

  // Skip cache for searches
  if (search && search.length > 0) {
    return;
  }

  // Only cache first few pages
  if (page > MAX_CACHED_PAGES) {
    return;
  }

  const cacheKey = getListCacheKey(params);
  await cache.set(cacheKey, data, LIST_CACHE_TTL);
}

/**
 * Invalidate all cached lists for a specific endpoint
 */
export async function invalidateListCache(
  endpoint: 'clients' | 'tasks' | 'groups',
  serviceLine?: string,
  subServiceLineGroup?: string
): Promise<void> {
  let prefix: string;
  if (endpoint === 'clients') {
    prefix = CACHE_PREFIXES.CLIENT;
  } else if (endpoint === 'tasks') {
    prefix = CACHE_PREFIXES.TASK;
  } else {
    prefix = CACHE_PREFIXES.CLIENT; // Groups use client prefix
  }
  
  // Build pattern for deletion
  const listType = endpoint === 'groups' ? 'groups' : 'list';
  let pattern = `${prefix}:${listType}`;
  
  if (serviceLine) {
    pattern = `${pattern}:*:sl${serviceLine}`;
  }
  
  if (subServiceLineGroup) {
    pattern = `${pattern}:*:sg${subServiceLineGroup}`;
  }

  await cache.invalidate(pattern);
}

/**
 * Invalidate client lists when a client is updated
 */
export async function invalidateClientListCache(GSClientID?: string): Promise<void> {
  // Invalidate all client lists with wildcard pattern
  await cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}:list:*`);
  
  // Also invalidate the specific client detail cache if provided
  if (GSClientID) {
    await cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}:${GSClientID}:*`);
  }
}

/**
 * Invalidate task lists when a task is updated
 */
export async function invalidateTaskListCache(taskId?: number): Promise<void> {
  // Invalidate all task lists with wildcard pattern
  await cache.invalidatePattern(`${CACHE_PREFIXES.TASK}:list:*`);
  
  // Also invalidate the specific task detail cache if provided
  if (taskId) {
    await cache.invalidatePattern(`${CACHE_PREFIXES.TASK}:detail:${taskId}:*`);
  }
}

/**
 * Invalidate group lists when a client group is updated
 */
export async function invalidateGroupListCache(groupCode?: string): Promise<void> {
  // Invalidate all group lists with wildcard pattern
  await cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}:groups:*`);
  
  // Also invalidate the specific group detail cache if provided
  if (groupCode) {
    await cache.invalidatePattern(`${CACHE_PREFIXES.CLIENT}:groups:*:gc${groupCode}*`);
  }
}

