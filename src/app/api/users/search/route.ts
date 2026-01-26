import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { searchActiveEmployees, EmployeeSearchFilters } from '@/lib/services/employees/employeeSearch';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

// Allowlists for filter validation
const MAX_QUERY_LENGTH = 100;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/users/search
 * Search active employees with optional filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize query param
    const rawQuery = searchParams.get('q') || '';
    const query = rawQuery.slice(0, MAX_QUERY_LENGTH);
    
    // Validate limit
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_LIMIT;
    if (Number.isNaN(parsedLimit) || parsedLimit < MIN_LIMIT || parsedLimit > MAX_LIMIT) {
      throw new AppError(400, `Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`, ErrorCodes.VALIDATION_ERROR);
    }
    const limit = parsedLimit;
    
    // Validate filter params (alphanumeric codes only)
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');
    const jobGrade = searchParams.get('jobGrade');
    const office = searchParams.get('office');
    
    // Validate subServiceLineGroup format if provided
    if (subServiceLineGroup && !/^[a-zA-Z0-9_-]+$/.test(subServiceLineGroup)) {
      throw new AppError(400, 'Invalid subServiceLineGroup format', ErrorCodes.VALIDATION_ERROR);
    }

    // Get taskId to exclude existing team members
    const taskId = searchParams.get('taskId');
    let excludeUserIds: string[] = [];

    if (taskId) {
      const taskIdNum = Number.parseInt(taskId, 10);
      if (!Number.isNaN(taskIdNum)) {
        // Fetch existing team members for this task
        const existingTeamMembers = await prisma.taskTeam.findMany({
          where: { taskId: taskIdNum },
          select: { userId: true },
        });
        excludeUserIds = existingTeamMembers.map(tm => tm.userId);
      }
    }

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
