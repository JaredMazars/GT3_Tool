import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateTemplateSchema } from '@/lib/validation/schemas';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(template));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/templates/[id]');
  }
}

/**
 * PUT /api/admin/templates/[id]
 * Update a template
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = UpdateTemplateSchema.parse(body);

    const template = await updateTemplate(templateId, validated);

    return NextResponse.json(successResponse(template));
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/templates/[id]');
  }
}

/**
 * DELETE /api/admin/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await deleteTemplate(templateId);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/templates/[id]');
  }
}

