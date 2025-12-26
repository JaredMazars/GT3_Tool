
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

  // Try both full email and username prefix
  const emailVariants = winLogons.flatMap(logon => {
    const lower = logon.toLowerCase();
    const prefix = lower.split('@')[0];
    return [lower, prefix].filter((v): v is string => !!v);
  });

  // 2. LEFT JOIN with User table to find registered users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: emailVariants } },
        { id: { in: winLogons } } // Sometimes ID matches WinLogon
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    }
  });

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

  // Fetch User records to get their emails
  let emailsFromUsers: string[] = [];
  if (potentialUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: potentialUserIds } },
      select: { id: true, email: true }
    });
    emailsFromUsers = users.map(u => u.email).filter(Boolean) as string[];
  }

  // Generate email variants for better matching
  const allEmailVariants = new Set<string>();
  [...potentialEmails, ...emailsFromUsers].forEach(email => {
    generateEmailVariants(email).forEach(variant => allEmailVariants.add(variant));
  });
  const allEmailsToQuery = Array.from(allEmailVariants);

  // Build query conditions
  const whereConditions: any[] = [];
  
  // Email-based lookups
  if (allEmailsToQuery.length > 0) {
    whereConditions.push({ WinLogon: { in: allEmailsToQuery } });
    // Also try email prefixes
    allEmailsToQuery.forEach(email => {
      const prefix = email.split('@')[0];
      if (prefix) {
        whereConditions.push({ WinLogon: { startsWith: `${prefix}@` } });
      }
    });
  }
  
  // Employee code-based lookups
  if (extractedEmpCodes.length > 0) {
    whereConditions.push({ EmpCode: { in: extractedEmpCodes } });
  }

  // Fetch employees (if we have any conditions)
  const employees = whereConditions.length > 0 
    ? await prisma.employee.findMany({
        where: { OR: whereConditions },
        select: {
          id: true,
          GSEmployeeID: true,
          EmpCode: true,
          EmpNameFull: true,
          EmpCatCode: true,
          OfficeCode: true,
          WinLogon: true
        }
      })
    : [];

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

  // Fetch all users at once to get email mappings
  const users = potentialUserIds.length > 0 
    ? await prisma.user.findMany({
        where: { id: { in: potentialUserIds } },
        select: { id: true, email: true }
      })
    : [];
  
  const userIdToEmail = new Map(users.map(u => [u.id.toLowerCase(), u.email?.toLowerCase()]));

  // Now map all original userIds to employees
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










