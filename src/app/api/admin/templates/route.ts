import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemSuperuser } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateTemplateSchema } from '@/lib/validation/schemas';
import {
  getTemplates,
  createTemplate,
  type TemplateFilter,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates
 * List all templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is superuser (admin access required)
    const hasAdminAccess = await isSystemSuperuser(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter: TemplateFilter = {
      type: searchParams.get('type') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      projectType: searchParams.get('projectType') || undefined,
      active: searchParams.get('active')
        ? searchParams.get('active') === 'true'
        : undefined,
      search: searchParams.get('search') || undefined,
    };

    const templates = await getTemplates(filter);

    return NextResponse.json(successResponse(templates));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/templates');
  }
}

/**
 * POST /api/admin/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is superuser (admin access required)
    const hasAdminAccess = await isSystemSuperuser(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateTemplateSchema.parse(body);

    const template = await createTemplate({
      ...validated,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(template), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/templates');
  }
}

