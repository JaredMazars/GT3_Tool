import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';

/**
 * GET /api/tools/[id]/assignments
 * Get all sub-service line group assignments for a tool
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const toolId = parseInt(params.id);
    if (isNaN(toolId)) {
      return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Get tool with assignments
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        serviceLines: {
          where: { active: true },
          select: {
            subServiceLineGroup: true,
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 5. Extract unique sub-service line groups
    const assignments = [...new Set(tool.serviceLines.map((sl) => sl.subServiceLineGroup))];

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
  } catch (error) {
    return handleApiError(error, 'Failed to fetch tool assignments');
  }
}

/**
 * PUT /api/tools/[id]/assignments
 * Update sub-service line group assignments for a tool
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const toolId = parseInt(params.id);
    if (isNaN(toolId)) {
      return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Parse and sanitize body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const { subServiceLineGroups } = sanitizedData;

    if (!Array.isArray(subServiceLineGroups)) {
      return NextResponse.json(
        { error: 'subServiceLineGroups must be an array' },
        { status: 400 }
      );
    }

    // 5. Check if tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 6. Update assignments in a transaction
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
          })),
        });
      }
    });

    // 7. Fetch updated tool with assignments
    const updatedTool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        serviceLines: {
          where: { active: true },
          select: {
            subServiceLineGroup: true,
          },
        },
      },
    });

    const assignments = [...new Set(updatedTool!.serviceLines.map((sl) => sl.subServiceLineGroup))];

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
  } catch (error) {
    return handleApiError(error, 'Failed to update tool assignments');
  }
}
