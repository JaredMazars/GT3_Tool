import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/employees/[empCode]
 * Get employee details by employee code
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const { empCode } = params;

    if (!empCode) {
      return NextResponse.json({ success: false, error: 'Employee code is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { EmpCode: empCode },
      select: {
        id: true, EmpCode: true, EmpName: true, EmpNameFull: true,
        WinLogon: true, OfficeCode: true, EmpCatCode: true, EmpCatDesc: true, Active: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(employee));
  },
});
