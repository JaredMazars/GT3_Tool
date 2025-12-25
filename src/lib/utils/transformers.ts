/**
 * Response Transformers
 * Utilities for transforming database responses to API-friendly formats
 */

import { Prisma } from '@prisma/client';

/**
 * Project response with Prisma includes
 */
type ProjectWithIncludes = Prisma.TaskGetPayload<{
  include: {
    Client: true;
    TaskTeam: true;
    _count: {
      select: {
        MappedAccount: true;
        TaxAdjustment: true;
      };
    };
  };
}>;

/**
 * Transformed project response
 */
export interface TransformedProject {
  id: number;
  name: string;
  description?: string | null;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId?: number | null;  // Internal ID - for queries
  taxYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
  client?: {
    id: number;
    GSClientID: string;  // External ID
    clientNameFull?: string | null;
    clientCode: string;
  } | null;
  users?: unknown[];
  userRole?: string | null;
  canAccess?: boolean;
  _count?: {
    mappings: number;
    taxAdjustments: number;
  };
}

/**
 * Transform project response from Prisma to API format
 * Handles Client → client transformation and _count field mapping
 */
export function transformProjectResponse(
  project: Partial<ProjectWithIncludes> & { Client?: unknown; TaskTeam?: unknown[] }
): TransformedProject {
  const { Client, TaskTeam, _count, ...rest } = project;
  
  const task = project as any; // Cast to access Task model fields

  return {
    ...rest,
    id: task.id!,
    name: task.TaskDesc || '',
    description: null,
    serviceLine: task.ServLineCode || '',
    status: task.Active || 'No',
    archived: false,
    taxYear: null,
    createdAt: task.createdAt!,
    updatedAt: task.updatedAt!,
    client: Client as TransformedProject['client'],
    users: TaskTeam,
    _count: _count
      ? {
          mappings: (_count as { MappedAccount?: number }).MappedAccount || 0,
          taxAdjustments: (_count as { TaxAdjustment?: number }).TaxAdjustment || 0,
        }
      : undefined,
  };
}

/**
 * Transform array of projects
 */
export function transformProjectsResponse(
  projects: (Partial<ProjectWithIncludes> & { Client?: unknown; TaskTeam?: unknown[] })[]
): TransformedProject[] {
  return projects.map(transformProjectResponse);
}

/**
 * Client response transformation (if needed in the future)
 */
export function transformClientResponse(client: {
  _count?: { Task?: number };
  [key: string]: unknown;
}) {
  const { _count, ...rest } = client;

  return {
    ...rest,
    _count: _count
      ? {
          tasks: _count.Task || 0,
        }
      : undefined,
  };
}

/**
 * Generic count transformer
 * Transforms Prisma _count fields to more readable names
 */
export function transformCount(
  count: Record<string, number>,
  mapping: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [prismaKey, apiKey] of Object.entries(mapping)) {
    if (count[prismaKey] !== undefined) {
      result[apiKey] = count[prismaKey];
    }
  }

  return result;
}

/**
 * User response transformer - removes sensitive fields
 */
export function transformUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image?: string | null;
  [key: string]: unknown;
}) {
  const { id, email, name, role, image } = user;

  return {
    id,
    email,
    name,
    role,
    image,
  };
}

/**
 * Pagination metadata transformer
 */
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export function transformPaginationMeta({ page, limit, total }: PaginationParams) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
}


