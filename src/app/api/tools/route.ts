import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';

/**
 * GET /api/tools
 * List all tools (with optional filtering by active status)
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // 4. Query tools
    const tools = await prisma.tool.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        subTabs: {
          where: { active: true },
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
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return successResponse(tools);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch tools');
  }
}

/**
 * POST /api/tools
 * Create a new tool
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

    const { name, code, description, icon, componentPath, active = true, sortOrder = 0 } = sanitizedData;

    // 4. Validate required fields
    if (!name || !code || !componentPath) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, componentPath' },
        { status: 400 }
      );
    }

    // 5. Check if code already exists
    const existingTool = await prisma.tool.findUnique({
      where: { code },
    });

    if (existingTool) {
      return NextResponse.json(
        { error: 'Tool with this code already exists' },
        { status: 409 }
      );
    }

    // 6. Create tool
    const tool = await prisma.tool.create({
      data: {
        name,
        code,
        description,
        icon,
        componentPath,
        active,
        sortOrder,
      },
      include: {
        subTabs: true,
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

    return successResponse(tool, 201);
  } catch (error) {
    return handleApiError(error, 'Failed to create tool');
  }
}
