export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getAllToolConfigs } from '@/components/tools/ToolRegistry.server';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools/registered
 * Get all tools registered in code (ToolRegistry) with sync status
 * Compares code registry with database to show which tools need registration
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async () => {
    // Get all tools from code registry (server-safe configs only)
    let registeredConfigs;
    try {
      registeredConfigs = getAllToolConfigs();
    } catch (configError) {
      logger.error('Error loading tool configs', configError);
      throw new AppError(
        500,
        'Failed to load tool configurations',
        ErrorCodes.INTERNAL_ERROR,
        { details: configError instanceof Error ? configError.message : 'Unknown error' }
      );
    }

    // Get all tools from database
    const dbTools = await prisma.tool.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
      },
    });

    // Create a map of DB tools by code for quick lookup
    const dbToolsByCode = new Map(dbTools.map((tool) => [tool.code, tool]));

    // Build response with sync status
    const registered = registeredConfigs.map((config) => {
      const dbTool = dbToolsByCode.get(config.code);

      let syncStatus: 'synced' | 'code_only' | 'db_only';
      if (dbTool) {
        syncStatus = 'synced';
      } else {
        syncStatus = 'code_only';
      }

      return {
        code: config.code,
        name: config.name,
        description: config.description,
        version: config.version,
        defaultSubTabs: config.defaultSubTabs || [],
        syncStatus,
        dbToolId: dbTool?.id,
        dbActive: dbTool?.active,
      };
    });

    // Find orphaned tools (in DB but not in code)
    const codeToolCodes = new Set(registeredConfigs.map((c) => c.code));
    const orphanedTools = dbTools
      .filter((tool) => !codeToolCodes.has(tool.code))
      .map((tool) => ({
        code: tool.code,
        name: tool.name,
        dbToolId: tool.id,
        dbActive: tool.active,
        syncStatus: 'db_only' as const,
      }));

    return NextResponse.json(
      successResponse({
        registered,
        orphaned: orphanedTools,
      })
    );
  },
});
