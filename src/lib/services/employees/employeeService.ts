
import { prisma } from '@/lib/db/prisma';
import { extractEmpCodeFromUserId, generateEmailVariants } from '@/lib/utils/employeeCodeExtractor';

export interface EmployeeWithUser {
  employee: {
    id: number;
    GSEmployeeID: string | null;
    EmpCode: string;
    EmpName: string;
    EmpNameFull: string;
    OfficeCode: string | null;
    ServLineCode: string | null;
    ServLineDesc: string | null;
    SubServLineCode: string | null;
    SubServLineDesc: string | null;
    EmpCatDesc: string | null;
    EmpCatCode: string | null;
    Active: string | null;
    EmpDateLeft: Date | null;
    WinLogon: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

// SQL Server has a 2100 parameter limit - batch queries to stay under
const SQL_PARAM_BATCH_SIZE = 500;

/**
 * Batch an array into chunks for SQL Server parameter limits
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Finds users that match the given employees based on WinLogon/Email.
 * Returns a map of Employee ID -> User
 */
export async function mapEmployeesToUsers(employees: { id: number; WinLogon: string | null }[]) {
  // 1. Build email/username lookup arrays for User matching
  const winLogons = employees
    .map(emp => emp.WinLogon)
    .filter((logon): logon is string => !!logon);
  
  if (winLogons.length === 0) {
    return new Map<number, NonNullable<EmployeeWithUser['user']>>();
  }

  // Try both full email and username prefix - use Set to dedupe
  const emailVariantSet = new Set<string>();
  winLogons.forEach(logon => {
    const lower = logon.toLowerCase();
    const prefix = lower.split('@')[0];
    emailVariantSet.add(lower);
    if (prefix) emailVariantSet.add(prefix);
  });
  const emailVariants = Array.from(emailVariantSet);

  // 2. Batch queries to respect SQL Server's 2100 parameter limit
  // We have 2 IN clauses (email and id), so split batch size accordingly
  const emailBatches = batchArray(emailVariants, SQL_PARAM_BATCH_SIZE);
  const winLogonBatches = batchArray(winLogons, SQL_PARAM_BATCH_SIZE);
  
  type UserRecord = { id: string; name: string | null; email: string; image: string | null };
  const allUsers: UserRecord[] = [];
  
  // Query in batches - run email and winLogon batches in parallel
  const batchPromises: Promise<UserRecord[]>[] = [];
  
  for (const batch of emailBatches) {
    batchPromises.push(
      prisma.user.findMany({
        where: { email: { in: batch } },
        select: { id: true, name: true, email: true, image: true }
      })
    );
  }
  
  for (const batch of winLogonBatches) {
    batchPromises.push(
      prisma.user.findMany({
        where: { id: { in: batch } },
        select: { id: true, name: true, email: true, image: true }
      })
    );
  }
  
  const batchResults = await Promise.all(batchPromises);
  batchResults.forEach(users => allUsers.push(...users));
  
  // Dedupe users by id
  const userById = new Map<string, UserRecord>();
  allUsers.forEach(u => userById.set(u.id, u));
  const users = Array.from(userById.values());

  // 3. Create user lookup map
  const userMap = new Map<string, typeof users[0]>();
  users.forEach(u => {
    const lowerEmail = u.email.toLowerCase();
    const emailPrefix = lowerEmail.split('@')[0];
    userMap.set(lowerEmail, u);
    if (emailPrefix) {
      userMap.set(emailPrefix, u);
    }
    userMap.set(u.id, u);
  });

  // 4. Map back to Employee ID
  const employeeUserMap = new Map<number, typeof users[0]>();
  
  employees.forEach(emp => {
    if (!emp.WinLogon) return;
    
    const winLogon = emp.WinLogon.toLowerCase();
    const winLogonPrefix = winLogon.split('@')[0];
    
    const matchedUser = userMap.get(winLogon) || 
                       (winLogonPrefix ? userMap.get(winLogonPrefix) : undefined);
    
    if (matchedUser) {
      employeeUserMap.set(emp.id, matchedUser);
    }
  });

  return employeeUserMap;
}

/**
 * Finds employees that match the given user IDs (WinLogon).
 * Returns a map of User ID (or WinLogon prefix) -> Employee
 */
export async function mapUsersToEmployees(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, any>();
  }

  // First, check if any userIds look like User.id (not emails)
  // User IDs typically have format like "emp_SOOA002_1765469537556"
  const potentialUserIds = userIds.filter(id => !id.includes('@'));
  const potentialEmails = userIds.filter(id => id.includes('@'));

  // Extract employee codes from non-email userIds (pending-EMPCODE, emp_EMPCODE_timestamp, etc.)
  const extractedEmpCodes: string[] = [];
  const userIdToEmpCode = new Map<string, string>();
  
  for (const userId of potentialUserIds) {
    const empCode = extractEmpCodeFromUserId(userId);
    if (empCode) {
      extractedEmpCodes.push(empCode);
      userIdToEmpCode.set(userId.toLowerCase(), empCode);
    }
  }

  // Fetch User records to get their emails - batched for SQL Server limits
  // Also build userIdToEmail map for later use
  let emailsFromUsers: string[] = [];
  const userIdToEmail = new Map<string, string>();
  
  if (potentialUserIds.length > 0) {
    const userBatches = batchArray(potentialUserIds, SQL_PARAM_BATCH_SIZE);
    const userResults = await Promise.all(
      userBatches.map(batch => 
        prisma.user.findMany({
          where: { id: { in: batch } },
          select: { id: true, email: true }
        })
      )
    );
    const allUsers = userResults.flat();
    emailsFromUsers = allUsers.map(u => u.email).filter(Boolean) as string[];
    
    // Build userIdToEmail map for Strategy 3 lookups later
    allUsers.forEach(u => {
      if (u.email) {
        userIdToEmail.set(u.id.toLowerCase(), u.email.toLowerCase());
      }
    });
  }

  // Generate email variants for better matching
  const allEmailVariants = new Set<string>();
  [...potentialEmails, ...emailsFromUsers].forEach(email => {
    generateEmailVariants(email).forEach(variant => allEmailVariants.add(variant));
  });
  const allEmailsToQuery = Array.from(allEmailVariants);

  // Fetch employees using batched queries to respect SQL Server's parameter limit
  type EmployeeRecord = {
    id: number;
    GSEmployeeID: string | null;
    EmpCode: string;
    EmpNameFull: string;
    EmpCatCode: string | null;
    OfficeCode: string | null;
    WinLogon: string | null;
  };
  const allEmployees: EmployeeRecord[] = [];
  const employeeSelect = {
    id: true,
    GSEmployeeID: true,
    EmpCode: true,
    EmpNameFull: true,
    EmpCatCode: true,
    OfficeCode: true,
    WinLogon: true
  } as const;

  // Batch email lookups
  if (allEmailsToQuery.length > 0) {
    const emailBatches = batchArray(allEmailsToQuery, SQL_PARAM_BATCH_SIZE);
    const emailResults = await Promise.all(
      emailBatches.map(batch =>
        prisma.employee.findMany({
          where: { WinLogon: { in: batch } },
          select: employeeSelect
        })
      )
    );
    emailResults.flat().forEach(emp => allEmployees.push(emp));
  }

  // Batch employee code lookups
  if (extractedEmpCodes.length > 0) {
    const empCodeBatches = batchArray(extractedEmpCodes, SQL_PARAM_BATCH_SIZE);
    const empCodeResults = await Promise.all(
      empCodeBatches.map(batch =>
        prisma.employee.findMany({
          where: { EmpCode: { in: batch } },
          select: employeeSelect
        })
      )
    );
    empCodeResults.flat().forEach(emp => allEmployees.push(emp));
  }

  // Dedupe employees by id
  const employeeById = new Map<number, EmployeeRecord>();
  allEmployees.forEach(emp => employeeById.set(emp.id, emp));
  const employees = Array.from(employeeById.values());

  // Build map - key by both original userIds and emails
  const employeeMap = new Map<string, typeof employees[0]>();
  
  // Create lookup maps
  const emailToEmployee = new Map<string, typeof employees[0]>();
  const empCodeToEmployee = new Map<string, typeof employees[0]>();
  
  employees.forEach(emp => {
    // Map by email
    if (emp.WinLogon) {
      const lowerLogon = emp.WinLogon.toLowerCase();
      emailToEmployee.set(lowerLogon, emp);
      
      // Also map by email prefix
      const prefix = lowerLogon.split('@')[0];
      if (prefix) {
        emailToEmployee.set(prefix, emp);
      }
    }
    
    // Map by employee code
    if (emp.EmpCode) {
      empCodeToEmployee.set(emp.EmpCode.toUpperCase(), emp);
    }
  });

  // Now map all original userIds to employees
  // (userIdToEmail was already built during the batched user fetch above)
  for (const userId of userIds) {
    const lowerUserId = userId.toLowerCase();
    let employee: typeof employees[0] | undefined;
    
    // Strategy 1: If it's an email, try direct email lookup
    if (userId.includes('@')) {
      employee = emailToEmployee.get(lowerUserId);
      
      // Try email prefix
      if (!employee) {
        const prefix = lowerUserId.split('@')[0];
        if (prefix) {
          employee = emailToEmployee.get(prefix);
        }
      }
      
      if (employee) {
        employeeMap.set(lowerUserId, employee);
        const prefix = lowerUserId.split('@')[0];
        if (prefix) {
          employeeMap.set(prefix, employee);
        }
      }
    } else {
      // Strategy 2: Check if we extracted an employee code from this userId
      const extractedEmpCode = userIdToEmpCode.get(lowerUserId);
      if (extractedEmpCode) {
        employee = empCodeToEmployee.get(extractedEmpCode.toUpperCase());
        if (employee) {
          employeeMap.set(lowerUserId, employee);
          employeeMap.set(extractedEmpCode.toUpperCase(), employee);
          employeeMap.set(extractedEmpCode.toLowerCase(), employee);
        }
      }
      
      // Strategy 3: It's a User ID - look up the email from our batch query
      if (!employee) {
        const userEmail = userIdToEmail.get(lowerUserId);
        
        if (userEmail) {
          employee = emailToEmployee.get(userEmail);
          if (employee) {
            // Map both the User ID and the email to the employee
            employeeMap.set(lowerUserId, employee);
            employeeMap.set(userEmail, employee);
            const prefix = userEmail.split('@')[0];
            if (prefix) {
              employeeMap.set(prefix, employee);
            }
          }
        }
      }
    }
  }

  return employeeMap;
}










