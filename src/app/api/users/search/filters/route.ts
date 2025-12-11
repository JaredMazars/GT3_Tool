import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getEmployeeFilterOptions } from '@/lib/services/employees/employeeSearch';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get available filter options
    const filterOptions = await getEmployeeFilterOptions();

    return NextResponse.json(successResponse(filterOptions));
  } catch (error) {
    return handleApiError(error, 'Get Employee Filter Options');
  }
}



