import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemSuperuser } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateTemplateSectionSchema } from '@/lib/validation/schemas';
import {
  getTemplateSections,
  createTemplateSection,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates/[id]/sections
 * Get all sections for a template
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

    const hasAdminAccess = await isSystemSuperuser(user.id);
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

    const sections = await getTemplateSections(templateId);

    return NextResponse.json(successResponse(sections));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/templates/[id]/sections');
  }
}

/**
 * POST /api/admin/templates/[id]/sections
 * Create a new section for a template
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemSuperuser(user.id);
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
    const validated = CreateTemplateSectionSchema.parse(body);

    const section = await createTemplateSection({
      ...validated,
      templateId,
    });

    return NextResponse.json(successResponse(section), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/templates/[id]/sections');
  }
}

