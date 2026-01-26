import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseToolId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateToolAssignmentsSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools/[id]/assignments
 * Get all sub-service line group assignments for a tool
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { params }) => {
    const toolId = parseToolId(params.id);

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        ServiceLineTool: {
          where: { active: true },
          select: {
            subServiceLineGroup: true,
          },
        },
      },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    // Extract unique sub-service line groups
    const assignments = [...new Set(tool.ServiceLineTool.map((sl) => sl.subServiceLineGroup))];

    return NextResponse.json(
      successResponse({
        tool: {
          id: tool.id,
          name: tool.name,
          code: tool.code,
          description: tool.description,
        },
        assignments,
      })
    );
  },
});

/**
 * PUT /api/tools/[id]/assignments
 * Update sub-service line group assignments for a tool
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TOOLS,
  schema: UpdateToolAssignmentsSchema,
  handler: async (request, { params, data }) => {
    const toolId = parseToolId(params.id);
    const { subServiceLineGroups } = data;

    // Check if tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    // Update assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing assignments for this tool
      await tx.serviceLineTool.deleteMany({
        where: { toolId },
      });

      // Create new assignments
      if (subServiceLineGroups.length > 0) {
        await tx.serviceLineTool.createMany({
          data: subServiceLineGroups.map((group: string) => ({
            toolId,
            subServiceLineGroup: group,
            active: true,
            updatedAt: new Date(),
          })),
        });
      }
    });

    // Fetch updated tool with assignments
    const updatedTool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        ServiceLineTool: {
          where: { active: true },
          select: {
            subServiceLineGroup: true,
          },
        },
      },
    });

    const assignments = [...new Set(updatedTool!.ServiceLineTool.map((sl) => sl.subServiceLineGroup))];

    return NextResponse.json(
      successResponse({
        tool: {
          id: updatedTool!.id,
          name: updatedTool!.name,
          code: updatedTool!.code,
          description: updatedTool!.description,
        },
        assignments,
      })
    );
  },
});








