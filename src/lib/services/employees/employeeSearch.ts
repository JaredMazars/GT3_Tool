import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';

export interface EmployeeSearchResult {
  id: number;
  GSEmployeeID: string;
  EmpCode: string;
  EmpName: string;
  EmpNameFull: string;
  WinLogon: string | null;
  ServLineCode: string;
  ServLineDesc: string;
  OfficeCode: string;
  Team: string | null;
  EmpCatDesc: string;
  User: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface EmployeeSearchFilters {
  serviceLine?: string;
  serviceLineCodes?: string[];
  jobGrade?: string;
  office?: string;
}

/**
 * Search for active employees
 * Matches employees to User accounts via WinLogon
 * @param query - Search term for name or employee code
 * @param limit - Maximum results to return
 * @param excludeUserIds - User IDs to exclude from results (e.g., already on task)
 * @param filters - Optional filters for service line and job grade
 */
interface EmployeeWhereClause {
  Active: string;
  ServLineCode?: { in: string[] };
  ServLineDesc?: string;
  EmpCatDesc?: string;
  OfficeCode?: string;
  AND?: Array<{
    OR: Array<
      | { EmpName: { contains: string } }
      | { EmpNameFull: { contains: string } }
      | { EmpCode: { contains: string } }
      | { WinLogon: { contains: string } }
    >;
  }>;
}

export async function searchActiveEmployees(
  query: string,
  limit: number = 20,
  excludeUserIds: string[] = [],
  filters?: EmployeeSearchFilters
): Promise<EmployeeSearchResult[]> {
  return withRetry(
    async () => {
      // Build where clause with proper AND/OR structure
      const whereClause: EmployeeWhereClause = {
        Active: 'Yes',
      };

      // Add service line filter - use ServLineCode for exact matching
      if (filters?.serviceLineCodes && filters.serviceLineCodes.length > 0) {
        whereClause.ServLineCode = { in: filters.serviceLineCodes };
      } else if (filters?.serviceLine) {
        whereClause.ServLineDesc = filters.serviceLine;
      }

      // Add job grade filter
      if (filters?.jobGrade) {
        whereClause.EmpCatDesc = filters.jobGrade;
      }

      // Add office filter
      if (filters?.office) {
        whereClause.OfficeCode = filters.office;
      }

      // Add search filter if query provided
      // When we have both filters and search, we need to ensure proper AND logic
      if (query.trim()) {
        whereClause.AND = [
          {
            OR: [
              { EmpName: { contains: query.trim() } },
              { EmpNameFull: { contains: query.trim() } },
              { EmpCode: { contains: query.trim() } },
              { WinLogon: { contains: query.trim() } },
            ],
          },
        ];
      }

      // Get active employees
      const employees = await prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          GSEmployeeID: true,
          EmpCode: true,
          EmpName: true,
          EmpNameFull: true,
          WinLogon: true,
          ServLineCode: true,
          ServLineDesc: true,
          OfficeCode: true,
          Team: true,
          EmpCatDesc: true,
        },
        take: limit,
        orderBy: {
          EmpNameFull: 'asc',
        },
      });

      // Get all users to match against
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      // Create a map for fast lookup by email/username
      const userMap = new Map<string, typeof users[0]>();
      users.forEach((user) => {
        // Store by full email
        if (user.email) {
          userMap.set(user.email.toLowerCase(), user);
          
          // Also store by username part (before @)
          const emailParts = user.email.split('@');
          if (emailParts[0]) {
            const username = emailParts[0].toLowerCase();
            if (!userMap.has(username)) {
              userMap.set(username, user);
            }
          }
        }
      });

      // Match employees to users
      const results: EmployeeSearchResult[] = employees.map((emp) => {
        let matchedUser = null;

        if (emp.WinLogon) {
          const winLogonLower = emp.WinLogon.toLowerCase();
          // Try exact match first
          matchedUser = userMap.get(winLogonLower);
          
          // If no match, try as username part
          if (!matchedUser) {
            const winLogonParts = winLogonLower.split('@');
            if (winLogonParts[0]) {
              matchedUser = userMap.get(winLogonParts[0]);
            }
          }
        }

        return {
          ...emp,
          User: matchedUser || null,
        };
      });

      // Filter out employees whose User is already excluded
      const filteredResults = results.filter((result) => {
        if (!result.User) return true; // Keep employees without User accounts
        return !excludeUserIds.includes(result.User.id);
      });

      return filteredResults;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Search active employees'
  );
}

/**
 * Get available filter options for employee search
 * Returns only service lines, job grades, and offices that have active employees
 * Excludes shared services (QRM, Business Development, IT, Finance, HR, Country Management)
 */
export async function getEmployeeFilterOptions(): Promise<{
  serviceLines: string[];
  jobGrades: string[];
  offices: string[];
}> {
  return withRetry(
    async () => {
      // Define shared service descriptions to exclude (not client-facing service lines)
      const sharedServiceDescriptions = [
        'Quality & Risk Management',
        'Quality and Risk Management',
        'QRM',
        'Business Development & Marketing',
        'Business Development',
        'Business Dev',
        'Marketing',
        'Information Technology',
        'IT',
        'Finance',
        'Internal Finance',
        'Human Resources',
        'HR',
        'Country Management',
        'Executive',
      ];

      // Get all active employees with their service line, job grade, and office
      const activeEmployees = await prisma.employee.findMany({
        where: {
          Active: 'Yes',
        },
        select: {
          ServLineDesc: true,
          EmpCatDesc: true,
          OfficeCode: true,
        },
      });

      // Extract unique values that are not empty/null
      const serviceLinesSet = new Set<string>();
      const jobGradesSet = new Set<string>();
      const officesSet = new Set<string>();

      activeEmployees.forEach((emp) => {
        // Add service line if it's valid and NOT a shared service
        if (emp.ServLineDesc && emp.ServLineDesc.trim().length > 0) {
          const trimmedDesc = emp.ServLineDesc.trim();
          // Check if it's not a shared service (case-insensitive)
          const isSharedService = sharedServiceDescriptions.some(
            (shared) => trimmedDesc.toLowerCase().includes(shared.toLowerCase()) ||
                       shared.toLowerCase().includes(trimmedDesc.toLowerCase())
          );
          
          if (!isSharedService) {
            serviceLinesSet.add(trimmedDesc);
          }
        }
        
        // Add job grade if it's valid
        if (emp.EmpCatDesc && emp.EmpCatDesc.trim().length > 0) {
          jobGradesSet.add(emp.EmpCatDesc.trim());
        }
        
        // Add office if it's valid
        if (emp.OfficeCode && emp.OfficeCode.trim().length > 0) {
          officesSet.add(emp.OfficeCode.trim());
        }
      });

      // Convert sets to sorted arrays
      const serviceLines = Array.from(serviceLinesSet).sort();
      const jobGrades = Array.from(jobGradesSet).sort();
      const offices = Array.from(officesSet).sort();

      return {
        serviceLines,
        jobGrades,
        offices,
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get employee filter options'
  );
}























