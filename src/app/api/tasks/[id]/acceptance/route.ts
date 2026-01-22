import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { canApproveAcceptance } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, AcceptanceErrorCodes } from '@/lib/utils/errorHandler';
import { parseTaskId } from '@/lib/utils/apiUtils';
import { logAcceptanceApproved } from '@/lib/services/acceptance/auditLog';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { toTaskId } from '@/types/branded';
import { invalidateOnTaskMutation } from '@/lib/services/cache/cacheInvalidation';
import { invalidateClientCache } from '@/lib/services/cache/cacheInvalidation';

/**
 * POST /api/tasks/[id]/acceptance
 * Approve client acceptance and continuance for a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'VIEWER',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const brandedTaskId = toTaskId(taskId);

    // Check if user can approve acceptance
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for task's service line)
    const hasApprovalPermission = await canApproveAcceptance(user.id, brandedTaskId);

    if (!hasApprovalPermission) {
      throw new AppError(
        403,
        'Only Partners and System Administrators can approve client acceptance',
        ErrorCodes.FORBIDDEN
      );
    }

    // Check if this is a client task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        Active: true,
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
            approvedBy: true,
            approvedAt: true,
          },
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    if (!task.Client) {
      throw new AppError(
        400,
        'Client acceptance is only required for client tasks',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (task.TaskAcceptance?.acceptanceApproved) {
      throw new AppError(
        400,
        'Client acceptance already approved',
        AcceptanceErrorCodes.ALREADY_APPROVED
      );
    }

    // Check that questionnaire is completed
    const questionnaireResponse = await prisma.clientAcceptanceResponse.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        completedBy: true,
        questionnaireType: true,
        overallRiskScore: true,
        riskRating: true,
      },
    });

    if (!questionnaireResponse) {
      throw new AppError(
        400,
        'Questionnaire must be initialized and completed before approval',
        AcceptanceErrorCodes.QUESTIONNAIRE_NOT_INITIALIZED
      );
    }

    if (!questionnaireResponse.completedAt) {
      throw new AppError(
        400,
        'Questionnaire must be completed and submitted before approval',
        AcceptanceErrorCodes.INCOMPLETE_QUESTIONNAIRE
      );
    }

    // Use transaction to ensure both updates succeed or both fail
    await prisma.$transaction(async (tx) => {
      // Update the acceptance response review status
      await tx.clientAcceptanceResponse.update({
        where: { id: questionnaireResponse.id },
        data: {
          reviewedBy: user.email || user.id,
          reviewedAt: new Date(),
        },
        select: { id: true },
      });

      // Upsert the TaskAcceptance record
      await tx.taskAcceptance.upsert({
        where: { taskId },
        create: {
          taskId,
          acceptanceApproved: true,
          approvedBy: user.id,
          approvedAt: new Date(),
          questionnaireType: questionnaireResponse.questionnaireType,
          overallRiskScore: questionnaireResponse.overallRiskScore,
          riskRating: questionnaireResponse.riskRating,
          updatedAt: new Date(),
        },
        update: {
          acceptanceApproved: true,
          approvedBy: user.id,
          approvedAt: new Date(),
          questionnaireType: questionnaireResponse.questionnaireType,
          overallRiskScore: questionnaireResponse.overallRiskScore,
          riskRating: questionnaireResponse.riskRating,
          updatedAt: new Date(),
        },
        select: { id: true },
      });
    });

    // Fetch the task with updated acceptance data for response
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        Active: true,
        ServLineCode: true,
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
            approvedBy: true,
            approvedAt: true,
          },
        },
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
    });

    // Audit log the approval
    await logAcceptanceApproved(
      brandedTaskId,
      user.id,
      questionnaireResponse.questionnaireType,
      questionnaireResponse.riskRating || undefined,
      questionnaireResponse.overallRiskScore || undefined
    );

    // Invalidate caches comprehensively after acceptance approval
    await invalidateOnTaskMutation(
      taskId,
      updatedTask?.ServLineCode,
      undefined // subServiceLineGroup - not available in current query
    );

    if (updatedTask?.Client?.GSClientID) {
      await invalidateClientCache(updatedTask.Client.GSClientID);
    }

    return NextResponse.json(successResponse(updatedTask), { status: 200 });
  },
});
