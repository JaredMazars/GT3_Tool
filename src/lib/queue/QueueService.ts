/**
 * Queue Service
 * 
 * Redis-backed job queue system for background task processing.
 * Inspired by BullMQ but simplified for our needs.
 * 
 * Features:
 * - Redis-backed for persistence across container restarts
 * - Job retry with exponential backoff
 * - Dead letter queue for failed jobs
 * - Priority queue support
 * - Job status tracking
 * 
 * Usage:
 * ```typescript
 * // Enqueue a job
 * await queue.enqueue('documents', 'extract', {
 *   documentId: 123,
 *   filePath: '/path/to/file',
 * }, { priority: 1, maxAttempts: 3 });
 * 
 * // Process jobs (in worker)
 * const job = await queue.dequeue('documents');
 * if (job) {
 *   await processJob(job);
 *   await queue.complete('documents', job.id);
 * }
 * ```
 */

import { getRedisClient, isRedisAvailable } from '@/lib/cache/redisClient';
import { logger } from '@/lib/utils/logger';
import { randomBytes } from 'crypto';

/**
 * Job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Job interface
 */
export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt?: Date;
  status: JobStatus;
  error?: string;
}

/**
 * Job enqueue options
 */
export interface EnqueueOptions {
  priority?: number;
  maxAttempts?: number;
  delay?: number; // Delay in milliseconds
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  total: number;
}

export class QueueService {
  private redis = getRedisClient();

  /**
   * Enqueue a new job
   * 
   * @param queueName - Name of the queue
   * @param jobType - Type of job
   * @param data - Job data
   * @param options - Enqueue options
   * @returns Job ID
   */
  async enqueue<T>(
    queueName: string,
    jobType: string,
    data: T,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const jobId = `job:${randomBytes(16).toString('hex')}`;
    const now = new Date();
    
    const job: Job<T> = {
      id: jobId,
      type: jobType,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: now,
      status: 'pending',
    };

    if (!this.redis || !isRedisAvailable()) {
      logger.warn('Redis not available, job will not persist', { queueName, jobType, jobId });
      return jobId;
    }

    try {
      // Store job data with 24 hour TTL
      await this.redis.set(
        `queue:${queueName}:job:${jobId}`,
        JSON.stringify(job),
        'EX',
        86400
      );

      // Calculate priority score (lower score = higher priority)
      // Use delay if provided, otherwise use priority or current timestamp
      const score = options.delay 
        ? Date.now() + options.delay
        : options.priority || Date.now();

      // Add to pending queue (sorted set by priority/timestamp)
      await this.redis.zadd(
        `queue:${queueName}:pending`,
        score,
        jobId
      );

      logger.info('Job enqueued', { queueName, jobType, jobId, priority: options.priority });
      return jobId;
    } catch (error) {
      logger.error('Error enqueueing job', { queueName, jobType, error });
      throw error;
    }
  }

  /**
   * Dequeue the next job from the queue
   * 
   * @param queueName - Name of the queue
   * @returns Job or null if queue is empty
   */
  async dequeue<T = any>(queueName: string): Promise<Job<T> | null> {
    if (!this.redis || !isRedisAvailable()) {
      return null;
    }

    try {
      // Get jobs that are ready to process (score <= now)
      const now = Date.now();
      const results = await this.redis.zrangebyscore(
        `queue:${queueName}:pending`,
        '-inf',
        now,
        'LIMIT',
        0,
        1
      );

      if (!results || results.length === 0) {
        return null;
      }

      const jobId = results[0];
      if (!jobId) {
        return null;
      }

      // Atomically remove from pending and add to processing
      const removed = await this.redis.zrem(`queue:${queueName}:pending`, jobId);
      if (removed === 0) {
        // Job was already taken by another worker
        return null;
      }

      // Get job data
      const jobData = await this.redis.get(`queue:${queueName}:job:${jobId}`);
      if (!jobData) {
        logger.warn('Job data not found', { queueName, jobId });
        return null;
      }

      const job = JSON.parse(jobData) as Job<T>;
      job.status = 'processing';
      job.updatedAt = new Date();

      // Add to processing set
      await this.redis.sadd(`queue:${queueName}:processing`, jobId);
      
      // Update job status
      await this.redis.set(
        `queue:${queueName}:job:${jobId}`,
        JSON.stringify(job),
        'EX',
        86400
      );

      logger.debug('Job dequeued', { queueName, jobId, type: job.type });
      return job;
    } catch (error) {
      logger.error('Error dequeuing job', { queueName, error });
      return null;
    }
  }

  /**
   * Mark a job as complete
   * 
   * @param queueName - Name of the queue
   * @param jobId - Job ID
   */
  async complete(queueName: string, jobId: string): Promise<void> {
    if (!this.redis || !isRedisAvailable()) {
      return;
    }

    try {
      // Remove from processing set
      await this.redis.srem(`queue:${queueName}:processing`, jobId);
      
      // Delete job data (or could move to completed set with shorter TTL)
      await this.redis.del(`queue:${queueName}:job:${jobId}`);
      
      logger.info('Job completed', { queueName, jobId });
    } catch (error) {
      logger.error('Error completing job', { queueName, jobId, error });
    }
  }

  /**
   * Retry a failed job
   * 
   * @param queueName - Name of the queue
   * @param jobId - Job ID
   * @param error - Error message
   */
  async retry(queueName: string, jobId: string, error?: string): Promise<void> {
    if (!this.redis || !isRedisAvailable()) {
      return;
    }

    try {
      const jobData = await this.redis.get(`queue:${queueName}:job:${jobId}`);
      if (!jobData) {
        logger.warn('Job not found for retry', { queueName, jobId });
        return;
      }

      const job = JSON.parse(jobData) as Job;
      job.attempts++;
      job.updatedAt = new Date();
      if (error) {
        job.error = error;
      }

      if (job.attempts >= job.maxAttempts) {
        // Move to dead letter queue (failed permanently)
        job.status = 'failed';
        await this.redis.sadd(`queue:${queueName}:failed`, jobId);
        await this.redis.srem(`queue:${queueName}:processing`, jobId);
        await this.redis.set(
          `queue:${queueName}:job:${jobId}`,
          JSON.stringify(job),
          'EX',
          86400 * 7 // Keep failed jobs for 7 days
        );
        
        logger.error('Job failed permanently', { queueName, jobId, attempts: job.attempts, error });
      } else {
        // Re-enqueue with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.attempts), 60000); // Max 60s
        job.status = 'pending';
        
        await this.redis.set(`queue:${queueName}:job:${jobId}`, JSON.stringify(job), 'EX', 86400);
        await this.redis.zadd(
          `queue:${queueName}:pending`,
          Date.now() + delay,
          jobId
        );
        await this.redis.srem(`queue:${queueName}:processing`, jobId);
        
        logger.warn('Job retry scheduled', { queueName, jobId, attempt: job.attempts, delayMs: delay });
      }
    } catch (error) {
      logger.error('Error retrying job', { queueName, jobId, error });
    }
  }

  /**
   * Get queue statistics
   * 
   * @param queueName - Name of the queue
   * @returns Queue statistics
   */
  async getStats(queueName: string): Promise<QueueStats> {
    if (!this.redis || !isRedisAvailable()) {
      return { pending: 0, processing: 0, failed: 0, total: 0 };
    }

    try {
      const [pending, processing, failed] = await Promise.all([
        this.redis.zcard(`queue:${queueName}:pending`),
        this.redis.scard(`queue:${queueName}:processing`),
        this.redis.scard(`queue:${queueName}:failed`),
      ]);

      return {
        pending,
        processing,
        failed,
        total: pending + processing + failed,
      };
    } catch (error) {
      logger.error('Error getting queue stats', { queueName, error });
      return { pending: 0, processing: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Get a specific job by ID
   * 
   * @param queueName - Name of the queue
   * @param jobId - Job ID
   * @returns Job or null
   */
  async getJob<T = any>(queueName: string, jobId: string): Promise<Job<T> | null> {
    if (!this.redis || !isRedisAvailable()) {
      return null;
    }

    try {
      const jobData = await this.redis.get(`queue:${queueName}:job:${jobId}`);
      if (!jobData) {
        return null;
      }

      return JSON.parse(jobData) as Job<T>;
    } catch (error) {
      logger.error('Error getting job', { queueName, jobId, error });
      return null;
    }
  }

  /**
   * Clean up stuck jobs (jobs in processing for too long)
   * Should be run periodically
   * 
   * @param queueName - Name of the queue
   * @param timeoutMs - Timeout in milliseconds (default: 1 hour)
   * @returns Number of jobs cleaned up
   */
  async cleanupStuckJobs(queueName: string, timeoutMs: number = 3600000): Promise<number> {
    if (!this.redis || !isRedisAvailable()) {
      return 0;
    }

    try {
      const processingJobIds = await this.redis.smembers(`queue:${queueName}:processing`);
      const now = Date.now();
      let cleanedUp = 0;

      for (const jobId of processingJobIds) {
        const job = await this.getJob(queueName, jobId);
        if (!job || !job.updatedAt) continue;

        const jobAge = now - new Date(job.updatedAt).getTime();
        if (jobAge > timeoutMs) {
          // Job is stuck, retry it
          await this.retry(queueName, jobId, 'Job timeout - stuck in processing');
          cleanedUp++;
        }
      }

      if (cleanedUp > 0) {
        logger.warn('Cleaned up stuck jobs', { queueName, count: cleanedUp });
      }

      return cleanedUp;
    } catch (error) {
      logger.error('Error cleaning up stuck jobs', { queueName, error });
      return 0;
    }
  }

  /**
   * Clear all jobs from a queue (use with caution!)
   * 
   * @param queueName - Name of the queue
   */
  async clearQueue(queueName: string): Promise<void> {
    if (!this.redis || !isRedisAvailable()) {
      return;
    }

    try {
      // Get all job IDs
      const pendingIds = await this.redis.zrange(`queue:${queueName}:pending`, 0, -1);
      const processingIds = await this.redis.smembers(`queue:${queueName}:processing`);
      const failedIds = await this.redis.smembers(`queue:${queueName}:failed`);

      const allJobIds = [...pendingIds, ...processingIds, ...failedIds];

      // Delete all job data
      const multi = this.redis.multi();
      for (const jobId of allJobIds) {
        multi.del(`queue:${queueName}:job:${jobId}`);
      }
      
      // Delete queue structures
      multi.del(`queue:${queueName}:pending`);
      multi.del(`queue:${queueName}:processing`);
      multi.del(`queue:${queueName}:failed`);
      
      await multi.exec();
      
      logger.warn('Queue cleared', { queueName, jobCount: allJobIds.length });
    } catch (error) {
      logger.error('Error clearing queue', { queueName, error });
    }
  }
}

// Singleton instance
export const queue = new QueueService();


