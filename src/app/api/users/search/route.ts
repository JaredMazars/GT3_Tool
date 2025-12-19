import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { searchActiveEmployees, EmployeeSearchFilters } from '@/lib/services/employees/employeeSearch';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search
 * Search active employees with optional filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');
    const jobGrade = searchParams.get('jobGrade');
    const office = searchParams.get('office');

    if (limit < 1 || limit > 100) {
      return NextResponse.json({ success: false, error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    const excludeUserIds: string[] = [];

    let serviceLineCodes: string[] = [];
    if (subServiceLineGroup) {
      const mappings = await prisma.serviceLineExternal.findMany({
        where: { SubServlineGroupCode: subServiceLineGroup },
        select: { ServLineCode: true }
      });
      serviceLineCodes = mappings
        .map(m => m.ServLineCode)
        .filter((code): code is string => code !== null);
    }

    const filters: EmployeeSearchFilters = {};
    if (serviceLineCodes.length > 0) {
      filters.serviceLineCodes = serviceLineCodes;
    }
    if (jobGrade) {
      filters.jobGrade = jobGrade;
    }
    if (office) {
      filters.office = office;
    }

    const employees = await searchActiveEmployees(query, limit, excludeUserIds, filters);

    const formattedUsers = employees.map(emp => ({
      id: emp.User?.id || '',
      email: emp.User?.email || emp.WinLogon || '',
      displayName: emp.EmpNameFull,
      userPrincipalName: emp.User?.email,
      jobTitle: emp.EmpCatDesc,
      department: emp.ServLineDesc,
      officeLocation: emp.OfficeCode,
      employeeId: emp.EmpCode,
      employeeType: emp.Team,
      hasUserAccount: emp.User !== null,
      GSEmployeeID: emp.GSEmployeeID,
      EmpCode: emp.EmpCode,
      ServLineCode: emp.ServLineCode,
      WinLogon: emp.WinLogon,
    }));

    return NextResponse.json(successResponse(formattedUsers));
  },
});
