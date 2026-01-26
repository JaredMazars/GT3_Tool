/**
 * Approval Service
 * Core business logic for the generic approval system
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import type {
  CreateApprovalConfig,
  ApprovalActionResult,
  UserApprovalsResponse,
  ApprovalWithSteps,
  DelegationConfig,
  WorkflowType,
  RouteConfig,
  RouteStepConfig,
} from '@/types/approval';
import type { Approval, ApprovalStep } from '@prisma/client';

export class ApprovalService {
  /**
   * Create a new approval with automatic routing
   */
  async createApproval(config: CreateApprovalConfig): Promise<Approval> {
    try {
      // Get the route for this workflow
      const route = await this.getRoute(config.workflowType, config.routeName);
      
      if (!route) {
        throw new AppError(
          404,
          `No route found for workflow type: ${config.workflowType}`,
          ErrorCodes.NOT_FOUND
        );
      }

      const routeConfig: RouteConfig = JSON.parse(route.routeConfig);

      // Create approval and steps in a transaction
      const { approval, steps } = await prisma.$transaction(async (tx) => {
        // Create the approval
        const newApproval = await tx.approval.create({
          data: {
            workflowType: config.workflowType,
            workflowId: config.workflowId,
            status: 'PENDING',
            priority: config.priority || 'MEDIUM',
            title: config.title,
            description: config.description,
            requestedById: config.requestedById,
            requiresAllSteps: routeConfig.requiresAllSteps,
            updatedAt: new Date(),
          },
        });

        // Create approval steps based on route configuration
        const steps = await this.createStepsFromRoute(
          tx,
          newApproval.id,
          routeConfig,
          config.context || {}
        );

        // Set the first pending step as current
        const firstPendingStep = steps.find((s) => s.status === 'PENDING');
        if (firstPendingStep) {
          await tx.approval.update({
            where: { id: newApproval.id },
            data: { currentStepId: firstPendingStep.id },
          });
        }

        return { approval: newApproval, steps };
      });

      logger.info('Approval created', {
        approvalId: approval.id,
        workflowType: config.workflowType,
        workflowId: config.workflowId,
      });

      // Send notifications to assigned approvers
      const requestedByUser = await prisma.user.findUnique({
        where: { id: config.requestedById },
        select: { name: true },
      });

      await this.sendApprovalNotifications(
        approval,
        steps,
        requestedByUser?.name || 'A user',
        config.context || {}
      );

      return approval;
    } catch (error) {
      logger.error('Error creating approval', { config, error });
      throw error;
    }
  }

  /**
   * Create approval steps from route configuration
   */
  private async createStepsFromRoute(
    tx: any,
    approvalId: number,
    routeConfig: RouteConfig,
    context: Record<string, unknown>
  ): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];

    for (const stepConfig of routeConfig.steps) {
      // Evaluate condition if present
      if (stepConfig.condition && !this.evaluateCondition(stepConfig.condition, context)) {
        logger.debug('Skipping step due to condition', { stepConfig, context });
        continue;
      }

      // Resolve assigned user based on step type
      let assignedToUserId: string | null = null;

      if (stepConfig.stepType === 'USER' && stepConfig.assignedToUserIdPath) {
        // Resolve user ID from context path
        assignedToUserId = this.resolvePathValue(context, stepConfig.assignedToUserIdPath);
        
        // If it's an employee code, find the user via Employee.WinLogon → User.email
        if (assignedToUserId && !assignedToUserId.startsWith('user_')) {
          // First, find the employee to get their WinLogon (email)
          const employee = await tx.employee.findFirst({
            where: { EmpCode: assignedToUserId },
            select: { WinLogon: true, EmpNameFull: true },
          });
          
          if (employee?.WinLogon) {
            // Then find the user with that email
            const user = await tx.user.findFirst({
              where: { email: employee.WinLogon.toLowerCase() },
              select: { id: true },
            });
            
            if (user) {
              assignedToUserId = user.id;
            } else {
              logger.warn('Employee has no user account', {
                empCode: assignedToUserId,
                empName: employee.EmpNameFull,
                winLogon: employee.WinLogon,
              });
              assignedToUserId = null;
            }
          } else {
            logger.warn('Employee not found or has no WinLogon', {
              empCode: assignedToUserId,
            });
            assignedToUserId = null;
          }
        }
      }

      const step = await tx.approvalStep.create({
        data: {
          approvalId,
          stepOrder: stepConfig.stepOrder,
          stepType: stepConfig.stepType,
          isRequired: stepConfig.isRequired ?? true,
          assignedToUserId,
          assignedToRole: stepConfig.assignedToRole,
          assignedToCondition: stepConfig.condition || null,
          status: 'PENDING',
        },
      });

      steps.push(step);
    }

    return steps;
  }

  /**
   * Send notifications to assigned approvers (both in-app and email)
   */
  private async sendApprovalNotifications(
    approval: Approval,
    steps: ApprovalStep[],
    requestedByName: string,
    context: Record<string, unknown>
  ): Promise<void> {
    const { createApprovalAssignedNotification } = await import('@/lib/services/notifications/templates');
    const { notificationService } = await import('@/lib/services/notifications/notificationService');
    const { emailService } = await import('@/lib/services/email/emailService');
    
    const template = createApprovalAssignedNotification(
      approval.title,
      approval.workflowType,
      requestedByName,
      approval.id
    );
    
    let notificationsSent = 0;
    let emailsSent = 0;
    
    for (const step of steps) {
      if (step.status !== 'PENDING') {
        continue;
      }
      
      // Case 1: User has account - send both in-app and email notifications
      if (step.assignedToUserId) {
        try {
          // Get user details for email
          const user = await prisma.user.findUnique({
            where: { id: step.assignedToUserId },
            select: { email: true, name: true },
          });
          
          if (user) {
            // Send in-app notification (navbar bell)
            await notificationService.createNotification(
              step.assignedToUserId,
              'APPROVAL_ASSIGNED',
              template.title,
              template.message,
              undefined, // taskId
              template.actionUrl,
              approval.requestedById
            );
            notificationsSent++;
            
            // Send email notification for CLIENT_ACCEPTANCE
            if (approval.workflowType === 'CLIENT_ACCEPTANCE') {
              const clientAcceptance = await prisma.clientAcceptance.findUnique({
                where: { id: approval.workflowId },
                include: {
                  Client: {
                    select: {
                      clientNameFull: true,
                      clientCode: true,
                    },
                  },
                },
              });
              
              if (clientAcceptance?.Client) {
                await emailService.sendClientAcceptanceApprovalEmail(
                  user.email,
                  user.name || user.email,
                  step.assignedToUserId,
                  clientAcceptance.Client.clientNameFull || clientAcceptance.Client.clientCode,
                  clientAcceptance.Client.clientCode,
                  clientAcceptance.riskRating || 'Unknown',
                  clientAcceptance.overallRiskScore,
                  requestedByName
                );
                emailsSent++;
              }
            }
            
            logger.info('Sent dual-channel notification (in-app + email)', {
              approvalId: approval.id,
              userId: step.assignedToUserId,
              userEmail: user.email,
            });
          }
        } catch (error) {
          logger.error('Failed to send notification to user with account', {
            approvalId: approval.id,
            userId: step.assignedToUserId,
            error,
          });
        }
      } 
      // Case 2: No user account - send email to employee's WinLogon
      else if (approval.workflowType === 'CLIENT_ACCEPTANCE') {
        try {
          // Get partner code from context or ClientAcceptance record
          const partnerCode = context.clientPartnerCode as string | undefined;
          
          if (partnerCode) {
            // Lookup employee to get email (WinLogon)
            const employee = await prisma.employee.findFirst({
              where: { EmpCode: partnerCode },
              select: { WinLogon: true, EmpNameFull: true },
            });
            
            if (employee?.WinLogon) {
              // Get client acceptance details
              const clientAcceptance = await prisma.clientAcceptance.findUnique({
                where: { id: approval.workflowId },
                include: {
                  Client: {
                    select: {
                      clientNameFull: true,
                      clientCode: true,
                    },
                  },
                },
              });
              
              if (clientAcceptance?.Client) {
                await emailService.sendClientAcceptanceApprovalEmail(
                  employee.WinLogon,
                  employee.EmpNameFull || employee.WinLogon,
                  null, // No user account
                  clientAcceptance.Client.clientNameFull || clientAcceptance.Client.clientCode,
                  clientAcceptance.Client.clientCode,
                  clientAcceptance.riskRating || 'Unknown',
                  clientAcceptance.overallRiskScore,
                  requestedByName
                );
                emailsSent++;
                
                logger.info('Sent email notification to employee without user account', {
                  approvalId: approval.id,
                  employeeCode: partnerCode,
                  employeeEmail: employee.WinLogon,
                  employeeName: employee.EmpNameFull,
                });
              }
            } else {
              logger.warn('Employee not found or has no WinLogon', {
                approvalId: approval.id,
                partnerCode,
              });
            }
          }
        } catch (error) {
          logger.error('Failed to send email notification to employee', {
            approvalId: approval.id,
            partnerCode: context.clientPartnerCode,
            error,
          });
        }
      }
    }
    
    if (notificationsSent === 0 && emailsSent === 0) {
      logger.warn('No notifications sent for approval', {
        approvalId: approval.id,
        workflowType: approval.workflowType,
        stepCount: steps.length,
      });
    } else {
      logger.info('Sent approval notifications', {
        approvalId: approval.id,
        inAppNotifications: notificationsSent,
        emailNotifications: emailsSent,
        totalRecipients: notificationsSent + emailsSent,
      });
    }
  }

  /**
   * Get pending approvals for a user (including delegated)
   */
  async getUserApprovals(userId: string): Promise<UserApprovalsResponse> {
    try {
      // Get active delegations TO this user
      const activeDelegations = await prisma.approvalDelegation.findMany({
        where: {
          toUserId: userId,
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        select: { fromUserId: true, workflowType: true },
      });

      const delegatedUserIds = activeDelegations.map((d) => d.fromUserId);

      // Build query for user's approvals (standard path)
      const approvals = await prisma.approval.findMany({
        where: {
          status: 'PENDING',
          ApprovalStep: {
            some: {
              status: 'PENDING',
              OR: [
                { assignedToUserId: userId },
                ...(delegatedUserIds.length > 0
                  ? [{ assignedToUserId: { in: delegatedUserIds } }]
                  : []),
              ],
            },
          },
        },
        include: {
          ApprovalStep: {
            where: {
              status: 'PENDING',
            },
            include: {
              User_ApprovalStep_assignedToUserIdToUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              User_ApprovalStep_delegatedToUserIdToUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          User_Approval_requestedByIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { requestedAt: 'desc' },
        ],
      });

      // Fallback path: Get CLIENT_ACCEPTANCE approvals where assignedToUserId is NULL
      // and user's employee code matches the pendingPartnerCode
      let clientAcceptanceApprovals: any[] = [];
      
      try {
        // Get user's employee code
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user?.email) {
          const employee = await prisma.employee.findFirst({
            where: {
              WinLogon: {
                equals: user.email,
              },
            },
            select: { EmpCode: true },
          });

          if (employee?.EmpCode) {
            // Find CLIENT_ACCEPTANCE approvals with NULL assignedToUserId
            // where the pendingPartnerCode matches user's employee code
            const clientAcceptances = await prisma.clientAcceptance.findMany({
              where: {
                pendingPartnerCode: employee.EmpCode,
                approvedAt: null, // Not yet approved
                completedAt: { not: null }, // Submitted
              },
              select: {
                id: true,
                approvalId: true,
                pendingPartnerCode: true,
              },
            });

            if (clientAcceptances.length > 0) {
              const approvalIds = clientAcceptances
                .filter((ca) => ca.approvalId)
                .map((ca) => ca.approvalId!);

              if (approvalIds.length > 0) {
                clientAcceptanceApprovals = await prisma.approval.findMany({
                  where: {
                    id: { in: approvalIds },
                    status: 'PENDING',
                    workflowType: 'CLIENT_ACCEPTANCE',
                    ApprovalStep: {
                      some: {
                        status: 'PENDING',
                        assignedToUserId: null, // NULL user ID (fallback path)
                      },
                    },
                  },
                  include: {
                    ApprovalStep: {
                      where: {
                        status: 'PENDING',
                      },
                      include: {
                        User_ApprovalStep_assignedToUserIdToUser: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                          },
                        },
                        User_ApprovalStep_delegatedToUserIdToUser: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                    User_Approval_requestedByIdToUser: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                });

                logger.info('Found CLIENT_ACCEPTANCE approvals via employee code fallback', {
                  userId,
                  employeeCode: employee.EmpCode,
                  count: clientAcceptanceApprovals.length,
                });
              }
            }
          }
        }
      } catch (fallbackError) {
        logger.error('Error in CLIENT_ACCEPTANCE fallback query', {
          userId,
          error: fallbackError,
        });
        // Don't throw - continue with standard approvals
      }

      // Merge approvals (remove duplicates)
      const allApprovals = [...approvals];
      const existingIds = new Set(approvals.map((a) => a.id));
      
      for (const approval of clientAcceptanceApprovals) {
        if (!existingIds.has(approval.id)) {
          allApprovals.push(approval);
        }
      }

      // Sort by priority and date
      allApprovals.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        }
        return b.requestedAt.getTime() - a.requestedAt.getTime();
      });

      // Group by workflow type
      const groupedByWorkflow = allApprovals.reduce((acc, approval) => {
        const type = approval.workflowType as WorkflowType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(approval);
        return acc;
      }, {} as Record<WorkflowType, ApprovalWithSteps[]>);

      return {
        approvals: allApprovals,
        groupedByWorkflow,
        totalCount: allApprovals.length,
      };
    } catch (error) {
      logger.error('Error getting user approvals', { userId, error });
      throw error;
    }
  }

  /**
   * Approve a specific step
   */
  async approveStep(
    stepId: number,
    userId: string,
    comment?: string
  ): Promise<ApprovalActionResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get the step
        const step = await tx.approvalStep.findUnique({
          where: { id: stepId },
          include: {
            Approval: true,
          },
        });

        if (!step) {
          throw new AppError(404, 'Approval step not found', ErrorCodes.NOT_FOUND);
        }

        // Verify user has permission
        await this.verifyStepPermission(step, userId);

        // Update the step
        await tx.approvalStep.update({
          where: { id: stepId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedById: userId,
            comment,
          },
        });

        // Check if approval is complete
        const allSteps = await tx.approvalStep.findMany({
          where: { approvalId: step.approvalId },
        });

        const requiresAllSteps = step.Approval.requiresAllSteps;
        const isComplete = this.checkApprovalComplete(allSteps, requiresAllSteps);

        // Find next pending step
        const nextStep = allSteps
          .filter((s) => s.status === 'PENDING')
          .sort((a, b) => a.stepOrder - b.stepOrder)[0];

        // Update approval status
        const updatedApproval = await tx.approval.update({
          where: { id: step.approvalId },
          data: {
            status: isComplete ? 'APPROVED' : 'PENDING',
            completedAt: isComplete ? new Date() : null,
            completedById: isComplete ? userId : null,
            currentStepId: nextStep?.id || null,
          },
        });

        logger.info('Approval step approved', {
          stepId,
          approvalId: step.approvalId,
          userId,
          isComplete,
        });

        // Execute workflow-specific completion logic if approval is complete
        if (isComplete) {
          await this.executeWorkflowCompletionHandler(
            {
              id: step.Approval.id,
              workflowType: step.Approval.workflowType,
              workflowId: step.Approval.workflowId,
            },
            userId,
            tx
          );
        }

        return {
          success: true,
          approval: updatedApproval,
          workflowType: step.Approval.workflowType,
          workflowId: step.Approval.workflowId,
          nextStep: nextStep || null,
          isComplete,
        };
      });
    } catch (error) {
      logger.error('Error approving step', { stepId, userId, error });
      throw error;
    }
  }

  /**
   * Reject a specific step
   */
  async rejectStep(
    stepId: number,
    userId: string,
    comment: string
  ): Promise<ApprovalActionResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get the step
        const step = await tx.approvalStep.findUnique({
          where: { id: stepId },
          include: {
            Approval: true,
          },
        });

        if (!step) {
          throw new AppError(404, 'Approval step not found', ErrorCodes.NOT_FOUND);
        }

        // Verify user has permission
        await this.verifyStepPermission(step, userId);

        // Update the step
        await tx.approvalStep.update({
          where: { id: stepId },
          data: {
            status: 'REJECTED',
            approvedAt: new Date(),
            approvedById: userId,
            comment,
          },
        });

        // Reject the entire approval
        const updatedApproval = await tx.approval.update({
          where: { id: step.approvalId },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
            completedById: userId,
            resolutionComment: comment,
          },
        });

        logger.info('Approval step rejected', {
          stepId,
          approvalId: step.approvalId,
          userId,
        });

        return {
          success: true,
          approval: updatedApproval,
          workflowType: step.Approval.workflowType,
          workflowId: step.Approval.workflowId,
          nextStep: null,
          isComplete: true,
        };
      });
    } catch (error) {
      logger.error('Error rejecting step', { stepId, userId, error });
      throw error;
    }
  }

  /**
   * Execute workflow-specific completion handlers
   * Called when an approval is fully approved
   */
  private async executeWorkflowCompletionHandler(
    approval: { id: number; workflowType: string; workflowId: number },
    approverId: string,
    tx: any
  ): Promise<void> {
    try {
      switch (approval.workflowType) {
        case 'CLIENT_ACCEPTANCE': {
          // Import client acceptance service dynamically
          const { approveClientAcceptance } = await import('@/lib/services/acceptance/clientAcceptanceService');
          
          // Get the ClientAcceptance record to find the clientId
          const acceptance = await tx.clientAcceptance.findUnique({
            where: { id: approval.workflowId },
            select: { clientId: true, approvedAt: true },
          });
          
          if (acceptance && !acceptance.approvedAt) {
            // Call the existing approval function which will:
            // 1. Update ClientAcceptance record with approval data
            // 2. Apply pending team changes to Client table
            // 3. Set validity period
            // IMPORTANT: Pass the transaction context to ensure atomic updates
            await approveClientAcceptance({
              clientId: acceptance.clientId,
              userId: approverId,
              approvalId: approval.id,
            }, tx);
            
            logger.info('Executed CLIENT_ACCEPTANCE completion handler', {
              approvalId: approval.id,
              workflowId: approval.workflowId,
              clientId: acceptance.clientId,
            });
          }
          break;
        }
        
        // Other workflow types can be added here as needed
        default:
          // No specific handler for this workflow type
          logger.debug('No completion handler for workflow type', {
            workflowType: approval.workflowType,
            approvalId: approval.id,
          });
          break;
      }
    } catch (error) {
      logger.error('Error executing workflow completion handler', {
        approvalId: approval.id,
        workflowType: approval.workflowType,
        error,
      });
      // Don't throw - we don't want to fail the approval if the handler fails
    }
  }

  /**
   * Create or update delegation
   */
  async delegateApprovals(
    fromUserId: string,
    config: DelegationConfig
  ): Promise<void> {
    try {
      await prisma.approvalDelegation.create({
        data: {
          fromUserId,
          toUserId: config.toUserId,
          workflowType: config.workflowType || null,
          startDate: config.startDate,
          endDate: config.endDate,
          reason: config.reason,
          isActive: true,
        },
      });

      logger.info('Approval delegation created', {
        fromUserId,
        toUserId: config.toUserId,
        workflowType: config.workflowType,
      });
    } catch (error) {
      logger.error('Error creating delegation', { fromUserId, config, error });
      throw error;
    }
  }

  /**
   * Get approval route
   */
  async getRoute(
    workflowType: WorkflowType,
    routeName?: string
  ): Promise<{ routeConfig: string } | null> {
    try {
      const route = await prisma.approvalRoute.findFirst({
        where: {
          workflowType,
          isActive: true,
          ...(routeName ? { routeName } : { isDefault: true }),
        },
        select: {
          routeConfig: true,
        },
      });

      return route;
    } catch (error) {
      logger.error('Error getting route', { workflowType, routeName, error });
      throw error;
    }
  }

  /**
   * Verify user has permission to act on a step
   */
  private async verifyStepPermission(
    step: ApprovalStep & { Approval: Approval },
    userId: string
  ): Promise<void> {
    // Check if user is assigned
    if (step.assignedToUserId === userId) {
      return;
    }

    // Check if delegated to user
    if (step.isDelegated && step.delegatedToUserId === userId) {
      return;
    }

    // Check if user has active delegation
    const delegation = await prisma.approvalDelegation.findFirst({
      where: {
        fromUserId: step.assignedToUserId || '',
        toUserId: userId,
        isActive: true,
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          {
            OR: [
              { workflowType: null },
              { workflowType: step.Approval.workflowType },
            ],
          },
        ],
      },
    });

    if (delegation) {
      // Mark step as delegated
      await prisma.approvalStep.update({
        where: { id: step.id },
        data: {
          isDelegated: true,
          delegatedToUserId: userId,
        },
      });
      return;
    }

    // Fallback for CLIENT_ACCEPTANCE when assignedToUserId is NULL
    // Check if user's employee code matches the partner code from ClientAcceptance
    if (!step.assignedToUserId && step.Approval.workflowType === 'CLIENT_ACCEPTANCE') {
      try {
        // Fetch ClientAcceptance record to get pendingPartnerCode
        const acceptance = await prisma.clientAcceptance.findUnique({
          where: { id: step.Approval.workflowId },
          select: { pendingPartnerCode: true },
        });

        const clientPartnerCode = acceptance?.pendingPartnerCode;

        if (clientPartnerCode) {
          // Get user's email to look up employee
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });

          if (user?.email) {
            // Look up employee by email (WinLogon)
            const employee = await prisma.employee.findFirst({
              where: {
                WinLogon: {
                  equals: user.email,
                },
              },
              select: { EmpCode: true },
            });

            // Check if employee code matches
            if (
              employee?.EmpCode &&
              employee.EmpCode.trim().toUpperCase() === clientPartnerCode.trim().toUpperCase()
            ) {
              return; // User is authorized via employee code match
            }
          }
        }
      } catch (error) {
        logger.warn('Error checking employee code fallback for CLIENT_ACCEPTANCE', {
          stepId: step.id,
          userId,
          error,
        });
        // Continue to throw forbidden error below
      }
    }

    throw new AppError(
      403,
      'You do not have permission to act on this approval',
      ErrorCodes.FORBIDDEN
    );
  }

  /**
   * Check if approval is complete
   */
  private checkApprovalComplete(
    steps: ApprovalStep[],
    requiresAllSteps: boolean
  ): boolean {
    const requiredSteps = steps.filter((s) => s.isRequired);
    
    if (requiresAllSteps) {
      // All required steps must be approved
      return requiredSteps.every((s) => s.status === 'APPROVED');
    } else {
      // At least one required step must be approved
      return requiredSteps.some((s) => s.status === 'APPROVED');
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    try {
      // Simple evaluation - in production, use a proper expression evaluator
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch (error) {
      logger.warn('Error evaluating condition', { condition, context, error });
      return false;
    }
  }

  /**
   * Resolve a value from a JSON path
   */
  private resolvePathValue(obj: Record<string, unknown>, path: string): string | null {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return typeof current === 'string' ? current : null;
  }
}

// Singleton instance
export const approvalService = new ApprovalService();
