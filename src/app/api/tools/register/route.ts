import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { RegisterToolSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { getToolConfigByCode } from '@/components/tools/ToolRegistry.server';


/**
 * POST /api/tools/register
 * Register a tool from code registry to database
 * Creates Tool and ToolSubTab entries based on tool config
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TOOLS,
  schema: RegisterToolSchema,
  handler: async (request, { data }) => {
    const { code } = data;

    // Get tool config from registry (server-safe)
    const toolConfig = getToolConfigByCode(code);
    if (!toolConfig) {
      throw new AppError(
        404,
        `Tool with code "${code}" not found in registry`,
        ErrorCodes.NOT_FOUND,
        { code }
      );
    }

    // Check if tool already exists in database
    const existingTool = await prisma.tool.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingTool) {
      throw new AppError(
        409,
        `Tool with code "${code}" already exists in database`,
        ErrorCodes.CONFLICT,
        { code }
      );
    }

    // Map tool codes to their actual directory names
    const toolDirectoryMap: Record<string, string> = {
      TAX_CALC: 'TaxCalculationTool',
      TAX_ADV: 'TaxAdvisoryTool',
      TAX_COMP: 'TaxComplianceTool',
    };

    const toolDirectory = toolDirectoryMap[code] || code;
    const componentPath = `@/components/tools/${toolDirectory}`;

    // Create tool and sub-tabs in a transaction
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
          updatedAt: new Date(),
        },
        select: { id: true },
      });

      // Create sub-tabs from defaultSubTabs if provided
      if (toolConfig.defaultSubTabs && toolConfig.defaultSubTabs.length > 0) {
        await tx.toolSubTab.createMany({
          data: toolConfig.defaultSubTabs.map((subTab, index) => ({
            toolId: tool.id,
            name: subTab.label,
            code: subTab.id,
            componentPath: componentPath,
            icon: subTab.icon,
            sortOrder: index,
            active: true,
            updatedAt: new Date(),
          })),
        });
      }

      // Fetch the complete tool with relationships
      return await tx.tool.findUnique({
        where: { id: tool.id },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          icon: true,
          componentPath: true,
          active: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
          ToolSubTab: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              code: true,
              icon: true,
              sortOrder: true,
            },
          },
          ServiceLineTool: {
            select: {
              subServiceLineGroup: true,
            },
          },
        },
      });
    });

    return NextResponse.json(successResponse(result), { status: 201 });
  },
});
