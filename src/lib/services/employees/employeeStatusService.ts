import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export interface EmployeeStatus {
  empCode: string;
  isActive: boolean;
  hasUserAccount: boolean;
}

/**
 * Get employee status for a single employee code
 */
export async function getEmployeeStatus(empCode: string): Promise<EmployeeStatus | null> {
  try {
    const employee = await prisma.employee.findFirst({
      where: { EmpCode: empCode },
      select: {
        EmpCode: true,
        Active: true,
        WinLogon: true,
      },
    });

    if (!employee) {
      return null;
    }

    const isActive = employee.Active === 'Yes';
    let hasUserAccount = false;

    // Check if employee has a user account
    if (employee.WinLogon) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: employee.WinLogon } },
            { email: { startsWith: employee.WinLogon.split('@')[0] } },
            { email: { equals: `${employee.WinLogon}@mazarsinafrica.onmicrosoft.com` } },
          ],
        },
        select: { id: true },
      });

      hasUserAccount = !!user;
    }

    return {
      empCode: employee.EmpCode,
      isActive,
      hasUserAccount,
    };
  } catch (error) {
    logger.error('Error getting employee status', { empCode, error });
    return null;
  }
}

/**
 * Batch lookup employee statuses for multiple employee codes
 * Returns a Map of empCode -> EmployeeStatus for efficient lookup
 */
export async function enrichEmployeesWithStatus(
  empCodes: string[]
): Promise<Map<string, EmployeeStatus>> {
  const statusMap = new Map<string, EmployeeStatus>();

  if (empCodes.length === 0) {
    return statusMap;
  }

  try {
    // Remove duplicates
    const uniqueEmpCodes = [...new Set(empCodes)];

    // Fetch all employees in one query
    const employees = await prisma.employee.findMany({
      where: {
        EmpCode: { in: uniqueEmpCodes },
      },
      select: {
        EmpCode: true,
        Active: true,
        WinLogon: true,
      },
    });

    // Collect all WinLogon values for user lookup
    const winLogons = employees
      .map((emp) => emp.WinLogon)
      .filter((logon): logon is string => !!logon);

    // Build email variants for matching
    const emailVariants = winLogons.flatMap((logon) => {
      const lower = logon.toLowerCase();
      const prefix = lower.split('@')[0];
      return prefix ? [lower, prefix, `${prefix}@mazarsinafrica.onmicrosoft.com`] : [lower];
    });

    // Fetch all matching users in one query
    const users = await prisma.user.findMany({
      where: {
        email: { in: emailVariants },
      },
      select: {
        email: true,
      },
    });

    // Create a set of user emails for quick lookup
    const userEmails = new Set(
      users.map((u) => u.email.toLowerCase())
    );

    // Build status map
    for (const emp of employees) {
      const isActive = emp.Active === 'Yes';
      let hasUserAccount = false;

      if (emp.WinLogon) {
        const winLogonLower = emp.WinLogon.toLowerCase();
        const prefix = winLogonLower.split('@')[0];

        // Check if any email variant exists in users
        hasUserAccount =
          userEmails.has(winLogonLower) ||
          (prefix ? userEmails.has(prefix) : false) ||
          (prefix ? userEmails.has(`${prefix}@mazarsinafrica.onmicrosoft.com`) : false);
      }

      statusMap.set(emp.EmpCode, {
        empCode: emp.EmpCode,
        isActive,
        hasUserAccount,
      });
    }

    // Log any missing employees
    const foundCodes = new Set(employees.map((e) => e.EmpCode));
    const missingCodes = uniqueEmpCodes.filter((code) => !foundCodes.has(code));
    if (missingCodes.length > 0) {
      logger.warn('Employee codes not found in database', { missingCodes });
    }

    return statusMap;
  } catch (error) {
    logger.error('Error enriching employees with status', { empCodes, error });
    return statusMap;
  }
}

/**
 * Enrich an array of objects with employee status data
 * Updates objects in place by adding status fields
 */
export async function enrichObjectsWithEmployeeStatus<
  T extends Record<string, any>
>(
  objects: T[],
  employeeCodeFields: { codeField: string; statusField: string }[]
): Promise<void> {
  // Collect all unique employee codes
  const allEmpCodes = new Set<string>();
  
  for (const obj of objects) {
    for (const { codeField } of employeeCodeFields) {
      const empCode = obj[codeField];
      if (empCode && typeof empCode === 'string') {
        allEmpCodes.add(empCode);
      }
    }
  }

  // Batch fetch statuses
  const statusMap = await enrichEmployeesWithStatus([...allEmpCodes]);

  // Enrich objects
  for (const obj of objects) {
    for (const { codeField, statusField } of employeeCodeFields) {
      const empCode = obj[codeField];
      if (empCode && typeof empCode === 'string') {
        const status = statusMap.get(empCode);
        // Set status or default to inactive if not found
        (obj as any)[statusField] = status || {
          empCode,
          isActive: false,
          hasUserAccount: false,
        };
      }
    }
  }
}

