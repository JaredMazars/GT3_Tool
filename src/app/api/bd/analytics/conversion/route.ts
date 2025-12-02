/**
 * BD Analytics - Conversion Metrics
 * GET /api/bd/analytics/conversion - Get conversion metrics (win/loss rates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getConversionMetrics } from '@/lib/services/bd/analyticsService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      serviceLine: searchParams.get('serviceLine') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      fromDate: searchParams.get('fromDate')
        ? new Date(searchParams.get('fromDate')!)
        : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
    };

    const metrics = await getConversionMetrics(filters);

    return NextResponse.json(successResponse(metrics));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/analytics/conversion');
  }
}

