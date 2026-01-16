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
      const approval = await prisma.$transaction(async (tx) => {
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

        return newApproval;
      });

      logger.info('Approval created', {
        approvalId: approval.id,
        workflowType: config.workflowType,
        workflowId: config.workflowId,
      });

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
        
        // If it's an employee code, find the user
        if (assignedToUserId && !assignedToUserId.startsWith('user_')) {
          const user = await tx.user.findFirst({
            where: {
              Employee: {
                some: {
                  EmpCode: assignedToUserId,
                },
              },
            },
            select: { id: true },
          });
          assignedToUserId = user?.id || null;
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

      // Build query for user's approvals
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

      // Group by workflow type
      const groupedByWorkflow = approvals.reduce((acc, approval) => {
        const type = approval.workflowType as WorkflowType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(approval);
        return acc;
      }, {} as Record<WorkflowType, ApprovalWithSteps[]>);

      return {
        approvals,
        groupedByWorkflow,
        totalCount: approvals.length,
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

        return {
          success: true,
          approval: updatedApproval,
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
