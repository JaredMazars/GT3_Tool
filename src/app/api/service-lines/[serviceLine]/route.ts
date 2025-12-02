import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  checkServiceLineAccess,
  getServiceLineStats 
} from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';

/**
 * GET /api/service-lines/[serviceLine]
 * Get statistics for a specific service line
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceLine: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceLine } = await context.params;

    // Validate service line
    if (!isValidServiceLine(serviceLine)) {
      return NextResponse.json(
        { error: 'Invalid service line' },
        { status: 400 }
      );
    }

    // Check access
    const hasAccess = await checkServiceLineAccess(user.id, serviceLine);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this service line' },
        { status: 403 }
      );
    }

    const stats = await getServiceLineStats(serviceLine);

    return NextResponse.json(successResponse(stats));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines/[serviceLine]');
  }
}

