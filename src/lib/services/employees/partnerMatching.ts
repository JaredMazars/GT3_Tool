/**
 * Partner Matching Utility
 * 
 * Shared utility for matching partner names extracted from documents
 * to employee codes in the database.
 * 
 * Used by:
 * - DPA extraction service
 * - Engagement letter extraction service
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

/**
 * Match partner name to employee code
 * 
 * Strategy:
 * 1. Check if the task partner matches the extracted name
 * 2. If not, search for partner by name in Employee table
 * 3. Return matched employee code or null if ambiguous/not found
 * 
 * @param partnerName - Partner name extracted from document
 * @param taskPartnerCode - Partner code from the task (for comparison)
 * @returns Matched employee code or null
 */
export async function matchPartnerByName(
  partnerName: string | null,
  taskPartnerCode: string
): Promise<string | null> {
  if (!partnerName) {
    return null;
  }

  try {
    // First, check if the task partner matches
    const taskPartner = await prisma.employee.findFirst({
      where: {
        EmpCode: taskPartnerCode,
      },
      select: {
        EmpCode: true,
        EmpName: true,
      },
    });

    if (taskPartner) {
      // Simple name matching (case-insensitive, partial match)
      const normalizedTaskName = taskPartner.EmpName.toLowerCase().trim();
      const normalizedExtractedName = partnerName.toLowerCase().trim();

      if (
        normalizedTaskName.includes(normalizedExtractedName) ||
        normalizedExtractedName.includes(normalizedTaskName)
      ) {
        return taskPartner.EmpCode;
      }
    }

    // Search for partner by name in Employee table
    const employees = await prisma.employee.findMany({
      where: {
        EmpName: {
          contains: partnerName,
        },
      },
      select: {
        EmpCode: true,
        EmpName: true,
      },
      take: 5,
    });

    // Only return if we have exactly one match
    if (employees.length === 1 && employees[0]) {
      return employees[0].EmpCode;
    }

    // If multiple matches or no matches, return null
    // This requires manual review to disambiguate
    return null;
  } catch (error) {
    logger.error('Error matching partner name to employee code', { 
      partnerName, 
      taskPartnerCode,
      error 
    });
    return null;
  }
}
