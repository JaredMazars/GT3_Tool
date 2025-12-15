import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';

/**
 * GET /api/tools/[id]
 * Get a specific tool by ID
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

    // 4. Query tool
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        subTabs: {
          orderBy: { sortOrder: 'asc' },
        },
        serviceLines: {
          include: {
            tool: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            subTabs: true,
            serviceLines: true,
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(tool));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch tool');
  }
}

/**
 * PUT /api/tools/[id]
 * Update a tool
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

    const { name, code, description, icon, componentPath, active, sortOrder } = sanitizedData;

    // 5. Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 6. Check if code is changing and already exists
    if (code && code !== existingTool.code) {
      const codeExists = await prisma.tool.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Tool with this code already exists' },
          { status: 409 }
        );
      }
    }

    // 7. Update tool
    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(componentPath !== undefined && { componentPath }),
        ...(active !== undefined && { active }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
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

    return NextResponse.json(successResponse(tool));
  } catch (error) {
    return handleApiError(error, 'Failed to update tool');
  }
}

/**
 * DELETE /api/tools/[id]
 * Delete a tool
 */
export async function DELETE(
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

    // 4. Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 5. Check if tool is in use
    if (existingTool._count.tasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tool that is assigned to tasks. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // 6. Delete tool (cascade will handle subTabs, serviceLines, etc.)
    await prisma.tool.delete({
      where: { id: toolId },
    });

    return NextResponse.json(successResponse({ message: 'Tool deleted successfully' }));
  } catch (error) {
    return handleApiError(error, 'Failed to delete tool');
  }
}
