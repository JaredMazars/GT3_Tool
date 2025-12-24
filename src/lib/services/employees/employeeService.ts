
import { prisma } from '@/lib/db/prisma';

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

  // Fetch User records to get their emails
  let emailsFromUsers: string[] = [];
  if (potentialUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: potentialUserIds } },
      select: { id: true, email: true }
    });
    emailsFromUsers = users.map(u => u.email).filter(Boolean) as string[];
  }

  // Combine all emails to query
  const allEmailsToQuery = [...potentialEmails, ...emailsFromUsers];

  // Fetch employees
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { WinLogon: { in: allEmailsToQuery } },
        // Also try email prefixes
        ...allEmailsToQuery.map(email => ({
          WinLogon: { startsWith: `${email.split('@')[0]}@` }
        }))
      ]
    },
    select: {
      id: true,
      GSEmployeeID: true,
      EmpCode: true,
      EmpNameFull: true,
      EmpCatCode: true,
      OfficeCode: true,
      WinLogon: true
    }
  });

  // Build map - key by both original userIds and emails
  const employeeMap = new Map<string, typeof employees[0]>();
  
  // First, create email -> employee mapping
  const emailToEmployee = new Map<string, typeof employees[0]>();
  employees.forEach(emp => {
    if (emp.WinLogon) {
      const lowerLogon = emp.WinLogon.toLowerCase();
      emailToEmployee.set(lowerLogon, emp);
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

  // Now map all original userIds (including User.id format) to employees
  for (const userId of userIds) {
    const lowerUserId = userId.toLowerCase();
    
    // If it's an email, directly map it
    if (userId.includes('@')) {
      const employee = emailToEmployee.get(lowerUserId);
      if (employee) {
        employeeMap.set(lowerUserId, employee);
        const prefix = lowerUserId.split('@')[0];
        if (prefix) {
          employeeMap.set(prefix, employee);
        }
      }
    } else {
      // It's a User ID - look up the email from our batch query
      const userEmail = userIdToEmail.get(lowerUserId);
      
      if (userEmail) {
        const employee = emailToEmployee.get(userEmail);
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

  return employeeMap;
}









