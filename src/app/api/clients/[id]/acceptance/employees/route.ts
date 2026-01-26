/**
 * GET /api/clients/[id]/acceptance/employees
 * Fetch employees for team selection in client acceptance
 * Partners restricted to LOCAL, DIR, or CARL categories. Managers and incharges can be any active employee.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';

export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.MANAGE_CLIENT_ACCEPTANCE,
  handler: async (request, { user, params }) => {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const excludePartner = searchParams.get('excludePartner');
    const excludeManager = searchParams.get('excludeManager');
    const currentPartner = searchParams.get('currentPartner');
    const currentManager = searchParams.get('currentManager');
    const currentIncharge = searchParams.get('currentIncharge');

    let where: any = { Active: 'Yes' };

    // For partners, only include LOCAL, DIR, or CARL categories
    if (role === 'partner') {
      where.EmpCatCode = {
        in: ['LOCAL', 'DIR', 'CARL'],
      };
    }

    // Build exclusion list to prevent same person in multiple roles
    const excludeCodes: string[] = [];
    
    // Exclude selected partner from manager and incharge lists
    if (excludePartner) {
      excludeCodes.push(excludePartner);
    }
    
    // For incharge, also exclude the selected manager
    if (role === 'incharge' && excludeManager) {
      excludeCodes.push(excludeManager);
    }
    
    // Apply exclusions if any
    if (excludeCodes.length > 0) {
      where.EmpCode = { notIn: excludeCodes };
    }

    let employees = await prisma.employee.findMany({
      where,
      select: {
        EmpCode: true,
        EmpNameFull: true,
        EmpCatCode: true,
        EmpCatDesc: true,
        OfficeCode: true,
        Active: true,
      },
      orderBy: { EmpNameFull: 'asc' },
      // No limit - return all active employees for client-side filtering
    });

    // Include current partner if not already in list (for historical data display)
    if (role === 'partner' && currentPartner) {
      const hasCurrentPartner = employees.some(emp => emp.EmpCode === currentPartner);
      if (!hasCurrentPartner) {
        const currentEmp = await prisma.employee.findFirst({
          where: { EmpCode: currentPartner },
          select: {
            EmpCode: true,
            EmpNameFull: true,
            EmpCatCode: true,
            EmpCatDesc: true,
            OfficeCode: true,
            Active: true,
          },
        });
        if (currentEmp) {
          // Add current partner to start of list (even if inactive for historical display)
          employees = [currentEmp, ...employees];
        }
      }
    }

    // Include current manager if not already in list (for historical data display)
    if (role === 'manager' && currentManager) {
      const hasCurrentManager = employees.some(emp => emp.EmpCode === currentManager);
      if (!hasCurrentManager) {
        const currentEmp = await prisma.employee.findFirst({
          where: { EmpCode: currentManager },
          select: {
            EmpCode: true,
            EmpNameFull: true,
            EmpCatCode: true,
            EmpCatDesc: true,
            OfficeCode: true,
            Active: true,
          },
        });
        if (currentEmp && currentEmp.Active === 'Yes') {
          // Add current manager to start of list
          employees = [currentEmp, ...employees];
        }
      }
    }

    // Include current incharge if not already in list (for historical data display)
    if (role === 'incharge' && currentIncharge) {
      const hasCurrentIncharge = employees.some(emp => emp.EmpCode === currentIncharge);
      if (!hasCurrentIncharge) {
        const currentEmp = await prisma.employee.findFirst({
          where: { EmpCode: currentIncharge },
          select: {
            EmpCode: true,
            EmpNameFull: true,
            EmpCatCode: true,
            EmpCatDesc: true,
            OfficeCode: true,
            Active: true,
          },
        });
        if (currentEmp && currentEmp.Active === 'Yes') {
          // Add current incharge to start of list
          employees = [currentEmp, ...employees];
        }
      }
    }

    // Enrich employees with user account status
    const employeeCodes = employees.map(emp => emp.EmpCode);
    const employeeStatusMap = await enrichEmployeesWithStatus(employeeCodes);
    
    const employeesWithStatus = employees.map(emp => ({
      ...emp,
      hasUserAccount: employeeStatusMap.get(emp.EmpCode)?.hasUserAccount ?? false,
    }));

    return NextResponse.json(successResponse(employeesWithStatus), {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  },
});
