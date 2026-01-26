/**
 * Document Extraction Worker
 * 
 * Background worker for processing document extraction jobs.
 * Handles AI-powered extraction of data from uploaded documents.
 * 
 * Usage:
 * ```typescript
 * // Start the worker (in a separate process or server route)
 * DocumentWorker.start();
 * ```
 */

import { queue, Job } from '../QueueService';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

/**
 * Document extraction job data
 */
export interface DocumentExtractionData {
  documentId: number;
  filePath: string;
  fileType: string;
  context?: string;
}

/**
 * Document extraction worker
 */
export class DocumentWorker {
  private static isRunning = false;
  private static pollInterval = 1000; // 1 second

  /**
   * Start the document extraction worker
   * Continuously polls for jobs and processes them
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Document worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Document worker started');

    while (this.isRunning) {
      try {
        const job = await queue.dequeue<DocumentExtractionData>('documents');
        
        if (!job) {
          // No jobs available, wait before checking again
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
          continue;
        }

        // Process the job
        await this.processJob(job);
      } catch (error) {
        logger.error('Document worker error', { error });
        // Wait a bit before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    logger.info('Document worker stopped');
  }

  /**
   * Stop the worker
   */
  static stop(): void {
    this.isRunning = false;
  }

  /**
   * Process a document extraction job
   */
  static async processJob(job: Job<DocumentExtractionData>): Promise<void> {
    const { documentId, filePath, fileType, context } = job.data;

    try {
      logger.info('Processing document extraction job', { 
        jobId: job.id, 
        documentId, 
        fileType,
        attempt: job.attempts + 1 
      });

      // Update document status to PROCESSING
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: { extractionStatus: 'PROCESSING' },
      });

      // Import DocumentExtractor dynamically to avoid circular dependencies
      const { DocumentExtractor } = await import('@/lib/services/documents/documentExtractor');

      // Extract data from document
      const extractedData = await DocumentExtractor.extractFromDocument(
        filePath,
        fileType,
        context
      );

      // Save extraction results
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'COMPLETED',
          extractedData: JSON.stringify(extractedData),
        },
      });

      // Update the associated tax adjustment with extracted data
      const document = await prisma.adjustmentDocument.findUnique({
        where: { id: documentId },
        include: { TaxAdjustment: true },
      });

      if (document?.TaxAdjustment) {
        const currentExtractedData = document.TaxAdjustment.extractedData
          ? JSON.parse(document.TaxAdjustment.extractedData)
          : {};

        await prisma.taxAdjustment.update({
          where: { id: document.taxAdjustmentId! },
          data: {
            extractedData: JSON.stringify({
              ...currentExtractedData,
              [documentId]: extractedData,
            }),
          },
        });
      }

      // Mark job as complete
      await queue.complete('documents', job.id);

      logger.info('Document extraction completed', { 
        jobId: job.id, 
        documentId,
        dataExtracted: !!extractedData 
      });
    } catch (error) {
      logger.error('Document extraction failed', { 
        jobId: job.id, 
        documentId, 
        error,
        attempt: job.attempts + 1 
      });

      // Update document status to FAILED
      await prisma.adjustmentDocument.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'FAILED',
          extractionError: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(err => {
        logger.error('Failed to update document status', { documentId, error: err });
      });

      // Retry the job
      await queue.retry('documents', job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process a single job by ID (for manual retry)
   */
  static async processJobById(jobId: string): Promise<void> {
    const job = await queue.getJob<DocumentExtractionData>('documents', jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await this.processJob(job);
  }
}


