/**
 * Cleanup service for acceptance questionnaires
 * Removes old draft responses and manages storage
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

/**
 * Clean up abandoned questionnaire responses older than specified days
 * Only removes drafts that haven't been completed
 * @param daysOld - Number of days old for cleanup (default: 90)
 * @returns Number of records deleted
 */
export async function cleanupOldDraftResponses(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    const result = await prisma.clientAcceptanceResponse.deleteMany({
      where: {
        completedAt: null,
        reviewedAt: null,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old draft responses`, {
      daysOld,
      cutoffDate: cutoffDate.toISOString(),
    });

    return result.count;
  } catch (error) {
    logger.error('Error cleaning up old draft responses', { error, daysOld });
    throw error;
  }
}

/**
 * Clean up orphaned documents
 * Note: With CASCADE delete in schema, orphaned documents are automatically removed
 * This function is kept for compatibility but will not find orphaned documents
 * @returns Number of orphaned documents deleted (always 0 with current schema)
 */
export async function cleanupOrphanedDocuments(): Promise<number> {
  // With CASCADE delete on Response relation, orphaned documents cannot exist
  // Documents are automatically deleted when their parent Response is deleted
  logger.info('No orphaned documents cleanup needed (CASCADE delete handles this)');
  return 0;
}

/**
 * Clean up old completed responses (for archival purposes)
 * Only removes responses older than specified years that are completed and approved
 * @param yearsOld - Number of years old for archival cleanup (default: 7)
 * @returns Number of records archived/deleted
 */
export async function archiveOldCompletedResponses(yearsOld: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

  try {
    // Only archive responses that are both completed and reviewed
    const result = await prisma.clientAcceptanceResponse.deleteMany({
      where: {
        completedAt: {
          not: null,
          lt: cutoffDate,
        },
        reviewedAt: {
          not: null,
        },
      },
    });

    logger.info(`Archived ${result.count} old completed responses`, {
      yearsOld,
      cutoffDate: cutoffDate.toISOString(),
    });

    return result.count;
  } catch (error) {
    logger.error('Error archiving old completed responses', { error, yearsOld });
    throw error;
  }
}

/**
 * Get cleanup statistics
 * Returns counts of responses eligible for cleanup
 */
export async function getCleanupStats(): Promise<{
  draftResponsesOlderThan90Days: number;
  orphanedDocuments: number;
  completedResponsesOlderThan7Years: number;
}> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const sevenYearsAgo = new Date();
  sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

  try {
    const [draftCount, orphanedCount, oldCompletedCount] = await Promise.all([
      // Draft responses older than 90 days
      prisma.clientAcceptanceResponse.count({
        where: {
          completedAt: null,
          reviewedAt: null,
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      }),

      // Orphaned documents (this query may not work as expected with Prisma)
      // Consider implementing a raw query if needed
      0, // Placeholder

      // Completed responses older than 7 years
      prisma.clientAcceptanceResponse.count({
        where: {
          completedAt: {
            not: null,
            lt: sevenYearsAgo,
          },
          reviewedAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      draftResponsesOlderThan90Days: draftCount,
      orphanedDocuments: orphanedCount,
      completedResponsesOlderThan7Years: oldCompletedCount,
    };
  } catch (error) {
    logger.error('Error getting cleanup statistics', { error });
    throw error;
  }
}

/**
 * Run all cleanup tasks
 * Convenience function to run all cleanup operations
 */
export async function runAllCleanup(): Promise<{
  draftsDeleted: number;
  orphanedDocumentsDeleted: number;
}> {
  logger.info('Starting cleanup tasks');

  const draftsDeleted = await cleanupOldDraftResponses(90);
  const orphanedDocumentsDeleted = await cleanupOrphanedDocuments();

  logger.info('Cleanup tasks completed', {
    draftsDeleted,
    orphanedDocumentsDeleted,
  });

  return {
    draftsDeleted,
    orphanedDocumentsDeleted,
  };
}


