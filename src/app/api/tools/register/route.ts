import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { getToolConfigByCode } from '@/components/tools/ToolRegistry.server';

/**
 * POST /api/tools/register
 * Register a tool from code registry to database
 * Creates Tool and ToolSubTab entries based on tool config
 */
export async function POST(request: NextRequest) {
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

    // 3. Parse and sanitize body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const { code } = sanitizedData;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid tool code' },
        { status: 400 }
      );
    }

    // 4. Get tool config from registry (server-safe)
    const toolConfig = getToolConfigByCode(code);
    if (!toolConfig) {
      return NextResponse.json(
        { error: `Tool with code "${code}" not found in registry` },
        { status: 404 }
      );
    }

    // 5. Check if tool already exists in database
    const existingTool = await prisma.tool.findUnique({
      where: { code },
    });

    if (existingTool) {
      return NextResponse.json(
        { error: `Tool with code "${code}" already exists in database` },
        { status: 409 }
      );
    }

    // 6. Determine componentPath (derived from tool structure)
    // Map tool codes to their actual directory names
    const toolDirectoryMap: Record<string, string> = {
      'TAX_CALC': 'TaxCalculationTool',
      'TAX_ADV': 'TaxAdvisoryTool',
      'TAX_COMP': 'TaxComplianceTool',
    };
    
    const toolDirectory = toolDirectoryMap[code] || code;
    const componentPath = `@/components/tools/${toolDirectory}`;

    // 7. Create tool and sub-tabs in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the tool
      const tool = await tx.tool.create({
        data: {
          name: toolConfig.name,
          code: toolConfig.code,
          description: toolConfig.description,
          componentPath,
          active: true,
          sortOrder: 0,
        },
      });

      // Create sub-tabs from defaultSubTabs if provided
      if (toolConfig.defaultSubTabs && toolConfig.defaultSubTabs.length > 0) {
        await tx.toolSubTab.createMany({
          data: toolConfig.defaultSubTabs.map((subTab, index) => ({
            toolId: tool.id,
            name: subTab.label,
            code: subTab.id,
            componentPath: `${componentPath}`, // Sub-tabs are handled internally by the tool component
            icon: subTab.icon,
            sortOrder: index,
            active: true,
          })),
        });
      }

      // Fetch the complete tool with relationships
      return await tx.tool.findUnique({
        where: { id: tool.id },
        include: {
          subTabs: {
            orderBy: { sortOrder: 'asc' },
          },
          serviceLines: true,
          _count: {
            select: {
              tasks: true,
              subTabs: true,
              serviceLines: true,
            },
          },
        },
      });
    });

    return NextResponse.json(successResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to register tool');
  }
}

