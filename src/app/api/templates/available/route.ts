import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getApplicableTemplates } from '@/lib/services/templates/templateService';

/**
 * GET /api/templates/available
 * Get templates applicable to a service line and project type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ENGAGEMENT_LETTER';
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const projectType = searchParams.get('projectType') || undefined;

    const templates = await getApplicableTemplates(type, serviceLine, projectType);

    return NextResponse.json(successResponse(templates));
  } catch (error) {
    return handleApiError(error, 'GET /api/templates/available');
  }
}















