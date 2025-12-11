import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { searchActiveEmployees, EmployeeSearchFilters } from '@/lib/services/employees/employeeSearch';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const taskId = searchParams.get('taskId');
    const serviceLine = searchParams.get('serviceLine');
    const jobGrade = searchParams.get('jobGrade');
    const office = searchParams.get('office');

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get list of user IDs already on the task (if taskId provided)
    let excludeUserIds: string[] = [];
    if (taskId) {
      const taskUsers = await prisma.taskTeam.findMany({
        where: { taskId: Number.parseInt(taskId) },
        select: { userId: true },
      });
      excludeUserIds = taskUsers.map(tu => tu.userId);
    }

    // Build filters
    const filters: EmployeeSearchFilters = {};
    if (serviceLine) {
      filters.serviceLine = serviceLine;
    }
    if (jobGrade) {
      filters.jobGrade = jobGrade;
    }
    if (office) {
      filters.office = office;
    }

    // Search active employees with User matching
    const employees = await searchActiveEmployees(query, limit, excludeUserIds, filters);

    // Transform to format expected by frontend (ADUser-compatible)
    const formattedUsers = employees.map(emp => ({
      id: emp.User?.id || '', // Empty string if no User account
      email: emp.User?.email || emp.WinLogon || '',
      displayName: emp.EmpNameFull,
      userPrincipalName: emp.User?.email,
      jobTitle: emp.EmpCatDesc,
      department: emp.ServLineDesc,
      officeLocation: emp.OfficeCode,
      employeeId: emp.EmpCode,
      employeeType: emp.Team,
      // Additional employee-specific fields
      hasUserAccount: emp.User !== null,
      GSEmployeeID: emp.GSEmployeeID,
      EmpCode: emp.EmpCode,
      ServLineCode: emp.ServLineCode,
      WinLogon: emp.WinLogon,
    }));

    return NextResponse.json(successResponse(formattedUsers));
  } catch (error) {
    return handleApiError(error, 'Search Users');
  }
}



