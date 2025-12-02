/**
 * Response Transformers
 * Utilities for transforming database responses to API-friendly formats
 */

import { Prisma } from '@prisma/client';

/**
 * Project response with Prisma includes
 */
type ProjectWithIncludes = Prisma.ProjectGetPayload<{
  include: {
    Client: true;
    ProjectUser: true;
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
  projectType: string;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId?: number | null;
  taxYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
  client?: {
    id: number;
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
  project: Partial<ProjectWithIncludes> & { Client?: unknown; ProjectUser?: unknown[] }
): TransformedProject {
  const { Client, ProjectUser, _count, ...rest } = project;

  return {
    ...rest,
    id: project.id!,
    name: project.name!,
    projectType: project.projectType!,
    serviceLine: project.serviceLine!,
    status: project.status!,
    archived: project.archived!,
    createdAt: project.createdAt!,
    updatedAt: project.updatedAt!,
    client: Client as TransformedProject['client'],
    users: ProjectUser,
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
  projects: (Partial<ProjectWithIncludes> & { Client?: unknown; ProjectUser?: unknown[] })[]
): TransformedProject[] {
  return projects.map(transformProjectResponse);
}

/**
 * Client response transformation (if needed in the future)
 */
export function transformClientResponse(client: {
  _count?: { Project?: number };
  [key: string]: unknown;
}) {
  const { _count, ...rest } = client;

  return {
    ...rest,
    _count: _count
      ? {
          projects: _count.Project || 0,
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

