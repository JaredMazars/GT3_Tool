import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

export interface EmployeeInfo {
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  GSEmployeeID: string;
}

// Cache TTL for employee data: 1 hour (3600 seconds)
const EMPLOYEE_CACHE_TTL = 3600;

/**
 * Get employee by EmpCode
 * Returns null if not found
 * Implements Redis caching for improved performance
 */
export async function getEmployeeByCode(
  empCode: string
): Promise<EmployeeInfo | null> {
  if (!empCode || empCode.trim() === '') {
    return null;
  }

  // Try cache first
  const cacheKey = `${CACHE_PREFIXES.USER}employee:${empCode}`;
  const cached = await cache.get<EmployeeInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  // Note: No Active filter - we want to show names for historical employees too
  const employee = await withRetry(
    async () => {
      return await prisma.employee.findFirst({
        where: {
          EmpCode: empCode,
        },
        select: {
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          GSEmployeeID: true,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get employee by code'
  );

  // Cache the result (even if null to prevent repeated lookups)
  if (employee) {
    await cache.set(cacheKey, employee, EMPLOYEE_CACHE_TTL);
  }

  return employee;
}

/**
 * Get multiple employees by EmpCode in batch
 * Returns a map of EmpCode -> EmployeeInfo
 * Missing employees will not be in the map
 * Implements Redis caching with batch optimization
 */
export async function getEmployeesByCodes(
  empCodes: string[],
  bypassCache: boolean = false
): Promise<Map<string, EmployeeInfo>> {
  if (!empCodes || empCodes.length === 0) {
    return new Map();
  }

  // Filter out empty codes
  const validCodes = empCodes.filter((code) => code && code.trim() !== '');

  if (validCodes.length === 0) {
    return new Map();
  }

  const employeeMap = new Map<string, EmployeeInfo>();
  const uncachedCodes: string[] = [];

  // Check cache for each employee (unless bypassing)
  if (!bypassCache) {
    await Promise.all(
      validCodes.map(async (code) => {
        const cacheKey = `${CACHE_PREFIXES.USER}employee:${code}`;
        const cached = await cache.get<EmployeeInfo>(cacheKey);
        if (cached) {
          employeeMap.set(code, cached);
        } else {
          uncachedCodes.push(code);
        }
      })
    );
  } else {
    // Bypass cache - fetch all from database
    uncachedCodes.push(...validCodes);
  }

  // If all employees were cached (and not bypassing), return early
  if (uncachedCodes.length === 0) {
    return employeeMap;
  }

  // Fetch uncached employees from database
  // Note: No Active filter - we want to show names for historical employees too
  const employees = await withRetry(
    async () => {
      return await prisma.employee.findMany({
        where: {
          EmpCode: { in: uncachedCodes },
        },
        select: {
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          GSEmployeeID: true,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get employees by codes batch'
  );

  // Cache and add to result map
  await Promise.all(
    employees.map(async (emp) => {
      const cacheKey = `${CACHE_PREFIXES.USER}employee:${emp.EmpCode}`;
      await cache.set(cacheKey, emp, EMPLOYEE_CACHE_TTL);
      employeeMap.set(emp.EmpCode, emp);
    })
  );

  return employeeMap;
}

/**
 * Enrich a single record with employee name
 * Helper function to add employee name to a code field
 */
export function enrichWithEmployeeName<T extends { [key: string]: any }>(
  record: T,
  codeField: keyof T,
  employeeMap: Map<string, EmployeeInfo>,
  nameField?: string
): T & { [key: string]: string | undefined } {
  const code = record[codeField] as string;
  const employee = code ? employeeMap.get(code) : null;
  const targetNameField = nameField || `${String(codeField)}Name`;

  return {
    ...record,
    [targetNameField]: employee?.EmpName,
  };
}

/**
 * Enrich multiple records with employee names
 * Batches the employee lookups for efficiency
 */
export async function enrichRecordsWithEmployeeNames<
  T extends { [key: string]: any }
>(
  records: T[],
  codeFields: Array<{ codeField: keyof T; nameField?: string }>,
  bypassCache: boolean = false
): Promise<Array<T & { [key: string]: string | undefined }>> {
  if (!records || records.length === 0) {
    return records;
  }

  // Collect all unique employee codes
  const allCodes = new Set<string>();
  records.forEach((record) => {
    codeFields.forEach(({ codeField }) => {
      const code = record[codeField];
      if (code && typeof code === 'string' && code.trim() !== '') {
        allCodes.add(code);
      }
    });
  });

  // Fetch all employees in one batch
  const employeeMap = await getEmployeesByCodes(Array.from(allCodes), bypassCache);

  // Enrich each record
  return records.map((record) => {
    let enrichedRecord = { ...record };

    codeFields.forEach(({ codeField, nameField }) => {
      enrichedRecord = enrichWithEmployeeName(
        enrichedRecord,
        codeField,
        employeeMap,
        nameField
      );
    });

    return enrichedRecord;
  });
}
