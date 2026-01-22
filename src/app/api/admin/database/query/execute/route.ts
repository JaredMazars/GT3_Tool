/**
 * API Route: Execute SQL Query
 * Executes read-only SELECT queries
 */

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { executeQuery } from '@/lib/services/admin/databaseService';
import { z } from 'zod';
import { auditAdminAction } from '@/lib/utils/auditLog';

const querySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(10000, 'Query too long'),
});

export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_DATABASE,
  schema: querySchema,
  handler: async (request, { user, data }) => {
    const { query } = data;

    // Execute query
    const result = await executeQuery(query);

    // Log the query execution
    await auditAdminAction(
      user.id,
      'EXECUTE_SQL_QUERY',
      'DATABASE',
      'query',
      {
        query: query.substring(0, 500), // Log first 500 chars
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
      }
    );

    return NextResponse.json(successResponse(result));
  },
});
