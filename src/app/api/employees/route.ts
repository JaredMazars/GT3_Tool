import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees
 * Fetch employees with optional filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('roleFilter');
    const officeCode = searchParams.get('officeCode');
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const empCatCodes = searchParams.get('empCatCodes')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const masterCode = searchParams.get('masterCode');

    const where: Record<string, unknown> = {};

    if (activeOnly) {
      where.Active = 'Yes';
    }

    if (officeCode) {
      where.OfficeCode = officeCode;
    }

    if (masterCode) {
      const serviceLineMapping = await prisma.serviceLineExternal.findMany({
        where: { masterCode: masterCode },
        select: { SubServlineGroupCode: true },
      });
      
      const subServiceLineCodes = serviceLineMapping
        .map(sl => sl.SubServlineGroupCode)
        .filter((code): code is string => code !== null && code !== undefined);
      
      if (subServiceLineCodes.length > 0) {
        where.ServLineCode = { in: subServiceLineCodes };
      }
    }

    if (empCatCodes && empCatCodes.length > 0) {
      where.EmpCatCode = { in: empCatCodes };
    } else if (roleFilter) {
      const categoryMap: Record<string, string[]> = {
        PARTNER: ['Partner', 'Senior Partner', 'Managing Partner'],
        MANAGER: ['Manager', 'Senior Manager', 'Associate Manager'],
        SUPERVISOR: ['Supervisor', 'Senior Supervisor'],
      };
      const categories = categoryMap[roleFilter];
      if (categories) {
        where.EmpCatDesc = { in: categories };
      }
    }

    if (search) {
      where.OR = [
        { EmpNameFull: { contains: search } },
        { EmpName: { contains: search } },
        { EmpCode: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true, EmpCode: true, EmpName: true, EmpNameFull: true,
        OfficeCode: true, EmpCatCode: true, EmpCatDesc: true,
        ServLineCode: true, ServLineDesc: true, Active: true,
      },
      orderBy: [{ EmpNameFull: 'asc' }],
      take: search ? 50 : 100,
    });

    return NextResponse.json(successResponse(employees));
  },
});
