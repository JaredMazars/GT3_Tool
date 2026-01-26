import { EmailClient, EmailMessage } from '@azure/communication-email';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';
import { prisma } from '@/lib/db/prisma';
import { 
  EmailNotificationType, 
  EmailStatus, 
  EmailSendResult,
  UserAddedEmailData,
  UserRemovedEmailData,
  EmailUser,
} from '@/types/email';
import { generateUserAddedHtml, generateUserAddedText } from './templates/userAddedTemplate';
import { generateUserRemovedHtml, generateUserRemovedText } from './templates/userRemovedTemplate';
import { 
  generateClientAcceptanceApprovalHtml, 
  generateClientAcceptanceApprovalText,
  ClientAcceptanceApprovalEmailData 
} from './templates/clientAcceptanceApprovalTemplate';

/**
 * Email Service using Azure Communication Services
 */
export class EmailService {
  private client: EmailClient | null = null;
  private fromAddress: string | null = null;
  private baseUrl: string;
  private configured: boolean;

  constructor() {
    this.baseUrl = env.nextAuthUrl;
    this.configured = !!(env.azureCommunicationConnectionString && env.emailFromAddress);
    
    if (this.configured) {
      try {
        this.client = new EmailClient(env.azureCommunicationConnectionString!);
        this.fromAddress = env.emailFromAddress!;
        logger.info('Email service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize email service:', error);
        this.configured = false;
      }
    } else {
      logger.warn('Email service not configured - email notifications will be disabled');
    }
  }

  /**
   * Check if a user has email notifications enabled for a specific type
   */
  async checkNotificationPreference(
    userId: string,
    taskId: number | null,
    notificationType: string
  ): Promise<boolean> {
    try {
      // Check task-specific preference first
      if (taskId) {
        const taskPref = await prisma.notificationPreference.findFirst({
          where: {
            userId,
            taskId,
            notificationType,
          },
        });

        if (taskPref !== null) {
          return taskPref.emailEnabled;
        }
      }

      // Check global preference (taskId = null)
      const globalPref = await prisma.notificationPreference.findFirst({
        where: {
          userId,
          taskId: null,
          notificationType,
        },
      });

      // Default to enabled if no preference is set
      return globalPref?.emailEnabled ?? true;
    } catch (error) {
      logger.error('Error checking notification preference:', error);
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Log email send attempt to database
   */
  async logEmail(
    recipientEmail: string,
    recipientUserId: string | null,
    emailType: string,
    subject: string,
    status: EmailStatus,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          recipientEmail,
          recipientUserId,
          emailType,
          subject,
          status,
          errorMessage: errorMessage || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          sentAt: status === EmailStatus.SENT ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error('Error logging email:', error);
      // Don't throw - logging failure shouldn't stop email sending
    }
  }

  /**
   * Send email using Azure Communication Services
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<EmailSendResult> {
    // Check if email service is configured
    if (!this.configured || !this.client || !this.fromAddress) {
      logger.warn('Email service not configured - skipping email send');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const message: EmailMessage = {
        senderAddress: this.fromAddress,
        content: {
          subject,
          plainText: textContent,
          html: htmlContent,
        },
        recipients: {
          to: [{ address: to }],
        },
      };

      const poller = await this.client.beginSend(message);
      const result = await poller.pollUntilDone();

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.id,
        status: result.status,
      });

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      logger.error('Error sending email:', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send user added to task notification
   */
  async sendUserAddedEmail(
    taskId: number,
    taskName: string,
    taskType: string,
    addedUser: EmailUser,
    addedBy: EmailUser,
    role: string
  ): Promise<EmailSendResult> {
    try {
      // Check if user wants to receive this notification
      const enabled = await this.checkNotificationPreference(
        addedUser.id,
        taskId,
        EmailNotificationType.USER_ADDED
      );

      if (!enabled) {
        logger.info('User has disabled USER_ADDED notifications', {
          userId: addedUser.id,
          taskId,
        });
        return { success: true, messageId: 'skipped' };
      }

      const data: UserAddedEmailData = {
        task: {
          id: taskId,
          name: taskName,
          taskType,
        },
        addedUser,
        addedBy,
        role,
        taskUrl: `${this.baseUrl}/dashboard/projects/${taskId}`,
      };

      const subject = `Added to Task: ${taskName}`;
      const htmlContent = generateUserAddedHtml(data);
      const textContent = generateUserAddedText(data);

      const result = await this.sendEmail(
        addedUser.email,
        subject,
        htmlContent,
        textContent
      );

      // Log the email
      await this.logEmail(
        addedUser.email,
        addedUser.id,
        EmailNotificationType.USER_ADDED,
        subject,
        result.success ? EmailStatus.SENT : EmailStatus.FAILED,
        result.error,
        {
          taskId,
          taskName,
          role,
          addedById: addedBy.id,
        }
      );

      return result;
    } catch (error) {
      logger.error('Error in sendUserAddedEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send user removed from task notification
   */
  async sendUserRemovedEmail(
    taskId: number,
    taskName: string,
    taskType: string,
    removedUser: EmailUser,
    removedBy: EmailUser
  ): Promise<EmailSendResult> {
    try {
      // Check if user wants to receive this notification
      const enabled = await this.checkNotificationPreference(
        removedUser.id,
        taskId,
        EmailNotificationType.USER_REMOVED
      );

      if (!enabled) {
        logger.info('User has disabled USER_REMOVED notifications', {
          userId: removedUser.id,
          taskId,
        });
        return { success: true, messageId: 'skipped' };
      }

      const data: UserRemovedEmailData = {
        task: {
          id: taskId,
          name: taskName,
          taskType,
        },
        removedUser,
        removedBy,
        taskUrl: `${this.baseUrl}/dashboard/projects/${taskId}`,
      };

      const subject = `Removed from Task: ${taskName}`;
      const htmlContent = generateUserRemovedHtml(data);
      const textContent = generateUserRemovedText(data);

      const result = await this.sendEmail(
        removedUser.email,
        subject,
        htmlContent,
        textContent
      );

      // Log the email
      await this.logEmail(
        removedUser.email,
        removedUser.id,
        EmailNotificationType.USER_REMOVED,
        subject,
        result.success ? EmailStatus.SENT : EmailStatus.FAILED,
        result.error,
        {
          taskId,
          taskName,
          removedById: removedBy.id,
        }
      );

      return result;
    } catch (error) {
      logger.error('Error in sendUserRemovedEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send client acceptance approval notification
   * This sends an email to the assigned partner when a client acceptance is submitted
   * 
   * @param approverEmail - Partner's email address (WinLogon for employees without user accounts)
   * @param approverName - Partner's full name
   * @param approverUserId - Partner's user ID (null if no account exists)
   * @param clientName - Full client name
   * @param clientCode - Client code
   * @param riskRating - Risk rating (LOW, MEDIUM, HIGH)
   * @param riskScore - Optional numeric risk score
   * @param submittedByName - Name of user who submitted the acceptance
   */
  async sendClientAcceptanceApprovalEmail(
    approverEmail: string,
    approverName: string,
    approverUserId: string | null,
    clientName: string,
    clientCode: string,
    riskRating: string,
    riskScore: number | null,
    submittedByName: string
  ): Promise<EmailSendResult> {
    try {
      // For users with accounts, check notification preferences
      if (approverUserId) {
        const enabled = await this.checkNotificationPreference(
          approverUserId,
          null, // No specific task, this is client-level
          'APPROVAL_ASSIGNED'
        );

        if (!enabled) {
          logger.info('User has disabled APPROVAL_ASSIGNED notifications', {
            userId: approverUserId,
            clientCode,
          });
          return { success: true, messageId: 'skipped' };
        }
      }

      const data: ClientAcceptanceApprovalEmailData = {
        approverName,
        approverEmail,
        clientName,
        clientCode,
        riskRating,
        riskScore: riskScore ?? undefined,
        submittedByName,
        approvalUrl: `${this.baseUrl}/dashboard/approvals`,
      };

      const subject = `Approval Required: Client Acceptance for ${clientName}`;
      const htmlContent = generateClientAcceptanceApprovalHtml(data);
      const textContent = generateClientAcceptanceApprovalText(data);

      const result = await this.sendEmail(
        approverEmail,
        subject,
        htmlContent,
        textContent
      );

      // Log the email
      await this.logEmail(
        approverEmail,
        approverUserId,
        'APPROVAL_ASSIGNED',
        subject,
        result.success ? EmailStatus.SENT : EmailStatus.FAILED,
        result.error,
        {
          clientName,
          clientCode,
          riskRating,
          riskScore,
          hasUserAccount: !!approverUserId,
        }
      );

      logger.info('Client acceptance approval email sent', {
        approverEmail,
        approverUserId: approverUserId || 'no-account',
        clientCode,
        riskRating,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Error in sendClientAcceptanceApprovalEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const emailService = new EmailService();


