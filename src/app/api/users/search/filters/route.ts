import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { getEmployeeFilterOptions } from '@/lib/services/employees/employeeSearch';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search/filters
 * Get available filter options for employee search
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const filterOptions = await getEmployeeFilterOptions();
    return NextResponse.json(successResponse(filterOptions));
  },
});
