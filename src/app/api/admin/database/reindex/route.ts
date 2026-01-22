/**
 * Database Reindex API
 * POST /api/admin/database/reindex - Rebuild indexes on specified tables
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { rebuildIndexes, ALLOWED_TABLES } from '@/lib/services/admin/databaseService';
import { auditAdminAction } from '@/lib/utils/auditLog';
import { cache } from '@/lib/services/cache/CacheService';

/**
 * Request schema for reindex operation
 */
const ReindexSchema = z.object({
  tables: z.array(z.string()).min(1, 'At least one table must be specified'),
});

/**
 * POST /api/admin/database/reindex
 * Rebuild indexes on specified tables
 * CRITICAL: Only whitelisted tables can be reindexed
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_DATABASE,
  schema: ReindexSchema,
  handler: async (request, { user, data }) => {
    // Validate all tables are in whitelist
    const invalidTables = data.tables.filter(
      table => !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])
    );

    if (invalidTables.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid tables: ${invalidTables.join(', ')}. Only whitelisted application tables can be reindexed.`,
        },
        { status: 400 }
      );
    }

    // Log the operation
    await auditAdminAction(
      user.id,
      'DATABASE_REINDEX',
      'DATABASE',
      'system',
      { tables: data.tables },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    // Execute reindex
    const result = await rebuildIndexes(data.tables);

    // Clear index health cache since it will be outdated
    await cache.delete('admin:database:indexes');

    return NextResponse.json(successResponse(result));
  },
});
