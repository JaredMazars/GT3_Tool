import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getAllToolConfigs } from '@/components/tools/ToolRegistry.server';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/tools/registered
 * Get all tools registered in code (ToolRegistry) with sync status
 * Compares code registry with database to show which tools need registration
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get all tools from code registry (server-safe configs only)
    let registeredConfigs;
    try {
      registeredConfigs = getAllToolConfigs();
    } catch (configError) {
      logger.error('Error loading tool configs', configError);
      return NextResponse.json(
        { error: 'Failed to load tool configurations', details: configError instanceof Error ? configError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // 4. Get all tools from database
    const dbTools = await prisma.tool.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
      },
    });

    // 5. Create a map of DB tools by code for quick lookup
    const dbToolsByCode = new Map(dbTools.map((tool) => [tool.code, tool]));

    // 6. Build response with sync status
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

    // 7. Find orphaned tools (in DB but not in code)
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

    return NextResponse.json(successResponse({
      registered,
      orphaned: orphanedTools,
    }));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch registered tools');
  }
}

