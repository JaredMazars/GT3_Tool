import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees
 * Fetch employees with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('roleFilter'); // PARTNER, MANAGER, etc.
    const officeCode = searchParams.get('officeCode');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true
    const empCatCodes = searchParams.get('empCatCodes')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const masterCode = searchParams.get('masterCode'); // TAX, AUDIT, ADVISORY, ACCOUNTING

    // Build where clause
    const where: any = {};

    // Filter by active status
    if (activeOnly) {
      where.Active = 'Yes';
    }

    // Filter by office code
    if (officeCode) {
      where.OfficeCode = officeCode;
    }

    // Filter by main service line (masterCode) via ServiceLineExternal mapping
    if (masterCode) {
      // Query ServiceLineExternal to get SubServlineGroupCode values for this masterCode
      // Employee.ServLineCode maps to ServiceLineExternal.SubServlineGroupCode
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

    // Filter by employee category codes (takes precedence over roleFilter)
    if (empCatCodes && empCatCodes.length > 0) {
      where.EmpCatCode = { in: empCatCodes };
    } else if (roleFilter) {
      // Map role filters to employee category descriptions
      // This is a simplified mapping - adjust based on actual data
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

    // Filter by search term
    if (search) {
      where.OR = [
        { EmpNameFull: { contains: search } },
        { EmpName: { contains: search } },
        { EmpCode: { contains: search } },
      ];
    }

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        EmpCode: true,
        EmpName: true,
        EmpNameFull: true,
        OfficeCode: true,
        EmpCatCode: true,
        EmpCatDesc: true,
        ServLineCode: true,
        ServLineDesc: true,
        Active: true,
      },
      orderBy: [
        { EmpNameFull: 'asc' },
      ],
      take: 200, // Limit results
    });

    return NextResponse.json(successResponse(employees));
  } catch (error) {
    return handleApiError(error, 'Get Employees');
  }
}
