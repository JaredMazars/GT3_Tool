import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';

export interface EmployeeInfo {
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  GSEmployeeID: string;
}

/**
 * Get employee by EmpCode
 * Returns null if not found
 */
export async function getEmployeeByCode(
  empCode: string
): Promise<EmployeeInfo | null> {
  if (!empCode || empCode.trim() === '') {
    return null;
  }

  return withRetry(
    async () => {
      const employee = await prisma.employee.findFirst({
        where: {
          EmpCode: empCode,
          Active: 'Yes',
        },
        select: {
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          GSEmployeeID: true,
        },
      });

      return employee;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get employee by code'
  );
}

/**
 * Get multiple employees by EmpCode in batch
 * Returns a map of EmpCode -> EmployeeInfo
 * Missing employees will not be in the map
 */
export async function getEmployeesByCodes(
  empCodes: string[]
): Promise<Map<string, EmployeeInfo>> {
  if (!empCodes || empCodes.length === 0) {
    return new Map();
  }

  // Filter out empty codes
  const validCodes = empCodes.filter((code) => code && code.trim() !== '');

  if (validCodes.length === 0) {
    return new Map();
  }

  return withRetry(
    async () => {
      const employees = await prisma.employee.findMany({
        where: {
          EmpCode: { in: validCodes },
          Active: 'Yes',
        },
        select: {
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          GSEmployeeID: true,
        },
      });

      // Create a map for fast lookup
      const employeeMap = new Map<string, EmployeeInfo>();
      employees.forEach((emp) => {
        employeeMap.set(emp.EmpCode, emp);
      });

      return employeeMap;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get employees by codes batch'
  );
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
    [targetNameField]: employee?.EmpNameFull,
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
  codeFields: Array<{ codeField: keyof T; nameField?: string }>
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
  const employeeMap = await getEmployeesByCodes(Array.from(allCodes));

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
