/**
 * Email Notification Worker
 * 
 * Background worker for processing email notification jobs.
 * Handles sending emails asynchronously to avoid blocking API requests.
 * 
 * Usage:
 * ```typescript
 * // Enqueue an email job
 * await queue.enqueue('emails', 'send', {
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   body: 'Welcome to the platform!',
 *   template: 'welcome',
 * });
 * 
 * // Start the worker (in a separate process or server route)
 * EmailWorker.start();
 * ```
 */

import { queue, Job } from '../QueueService';
import { logger } from '@/lib/utils/logger';

/**
 * Email job data
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  body?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Email notification worker
 */
export class EmailWorker {
  private static isRunning = false;
  private static pollInterval = 2000; // 2 seconds

  /**
   * Start the email worker
   * Continuously polls for jobs and processes them
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Email worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Email worker started');

    while (this.isRunning) {
      try {
        const job = await queue.dequeue<EmailJobData>('emails');
        
        if (!job) {
          // No jobs available, wait before checking again
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
          continue;
        }

        // Process the job
        await this.processJob(job);
      } catch (error) {
        logger.error('Email worker error', { error });
        // Wait a bit before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    logger.info('Email worker stopped');
  }

  /**
   * Stop the worker
   */
  static stop(): void {
    this.isRunning = false;
  }

  /**
   * Process an email job
   */
  static async processJob(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, body, html, template, templateData } = job.data;

    try {
      logger.info('Processing email job', { 
        jobId: job.id, 
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        template,
        attempt: job.attempts + 1 
      });

      // Import email service dynamically
      const { emailService } = await import('@/lib/services/email/emailService');

      // Validate required fields
      const toAddress = Array.isArray(to) ? to[0] : to;
      if (!toAddress || !subject) {
        throw new Error('Missing required email fields: to and subject are required');
      }

      // Send the email
      await emailService.sendEmail(
        toAddress,
        subject,
        html || body || '',
        body || ''
      );

      // Mark job as complete
      await queue.complete('emails', job.id);

      logger.info('Email sent successfully', { 
        jobId: job.id, 
        to: Array.isArray(to) ? to.join(', ') : to,
        subject 
      });
    } catch (error) {
      logger.error('Email sending failed', { 
        jobId: job.id, 
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        error,
        attempt: job.attempts + 1 
      });

      // Retry the job
      await queue.retry('emails', job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process a single job by ID (for manual retry)
   */
  static async processJobById(jobId: string): Promise<void> {
    const job = await queue.getJob<EmailJobData>('emails', jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await this.processJob(job);
  }
}

/**
 * Helper function to enqueue an email
 * 
 * @param emailData - Email data
 * @param options - Enqueue options
 * @returns Job ID
 */
export async function enqueueEmail(
  emailData: EmailJobData,
  options?: { priority?: number; maxAttempts?: number }
): Promise<string> {
  return queue.enqueue('emails', 'send', emailData, {
    priority: options?.priority || 5,
    maxAttempts: options?.maxAttempts || 3,
  });
}


