/**
 * Client Acceptance Service
 * Business logic for client-level risk assessment and acceptance
 */

import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { 
  CLIENT_ACCEPTANCE_QUESTIONNAIRE,
  type AcceptanceQuestionDef 
} from '@/constants/acceptance-questions';
import type { ClientAcceptance, ClientAcceptanceAnswer } from '@/types';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';

export interface ClientAcceptanceStatus {
  exists: boolean;
  completed: boolean;
  approved: boolean;
  researchCompleted: boolean;
  researchSkipped: boolean;
  riskRating: string | null;
  overallRiskScore: number | null;
  completedAt: Date | null;
  completedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  validUntil: Date | null;
  pendingApproverName: string | null;
  pendingPartnerCode: string | null;
  // Approval mode fields
  approvalId: number | null;
  currentStepId: number | null;
  canCurrentUserApprove: boolean;
}

export interface CreateClientAcceptanceInput {
  clientId: number;
  userId: string;
}

export interface SubmitClientAcceptanceInput {
  clientId: number;
  answers: Record<string, { answer: string; comment?: string }>;
  userId: string;
  selectedPartnerCode?: string;
  selectedManagerCode?: string;
  selectedInchargeCode?: string;
}

export interface ApproveClientAcceptanceInput {
  clientId: number;
  userId: string;
  approvalId?: number;
}

/**
 * Get question ID from questionKey
 */
export async function getQuestionIdFromKey(
  questionKey: string,
  questionnaireType: string = 'CLIENT_ACCEPTANCE'
): Promise<number | null> {
  const question = await prisma.acceptanceQuestion.findUnique({
    where: {
      questionnaireType_questionKey: {
        questionnaireType,
        questionKey,
      },
    },
    select: { id: true },
  });
  return question?.id || null;
}

/**
 * Check if a client has a valid acceptance
 */
export async function getClientAcceptanceStatus(
  clientId: number,
  userId?: string
): Promise<ClientAcceptanceStatus> {
  const acceptance = await prisma.clientAcceptance.findUnique({
    where: { clientId },
    select: {
      id: true,
      completedAt: true,
      completedBy: true,
      approvedAt: true,
      approvedBy: true,
      approvalId: true,
      riskRating: true,
      overallRiskScore: true,
      validUntil: true,
      researchCompleted: true,
      researchSkipped: true,
      pendingPartnerCode: true,
    },
  });

  if (!acceptance) {
    return {
      exists: false,
      completed: false,
      approved: false,
      researchCompleted: false,
      researchSkipped: false,
      riskRating: null,
      overallRiskScore: null,
      completedAt: null,
      completedBy: null,
      approvedAt: null,
      approvedBy: null,
      validUntil: null,
      pendingApproverName: null,
      pendingPartnerCode: null,
      approvalId: null,
      currentStepId: null,
      canCurrentUserApprove: false,
    };
  }

  // Fetch user names, pending approval step, and partner name in parallel
  const [completedUser, approvedUser, pendingStep, partnerEmployee] = await Promise.all([
    acceptance.completedBy
      ? prisma.user.findUnique({
          where: { id: acceptance.completedBy },
          select: { name: true },
        })
      : null,
    acceptance.approvedBy
      ? prisma.user.findUnique({
          where: { id: acceptance.approvedBy },
          select: { name: true },
        })
      : null,
    acceptance.approvalId && !acceptance.approvedAt
      ? prisma.approvalStep.findFirst({
          where: {
            approvalId: acceptance.approvalId,
            status: 'PENDING',
          },
          orderBy: { stepOrder: 'asc' },
          include: {
            User_ApprovalStep_assignedToUserIdToUser: {
              select: { name: true },
            },
          },
        })
      : null,
    acceptance.pendingPartnerCode
      ? prisma.employee.findFirst({
          where: { EmpCode: acceptance.pendingPartnerCode },
          select: { EmpNameFull: true },
        })
      : null,
  ]);

  // Get pending approver name from approval step (if user account exists) or from employee record (fallback)
  const pendingApproverName = 
    pendingStep?.User_ApprovalStep_assignedToUserIdToUser?.name || // User account name
    partnerEmployee?.EmpNameFull || // Employee record name as fallback
    null;

  // Check if current user can approve (if userId provided)
  // Two paths: 1) User ID matches approval step, 2) User's employee code matches pendingPartnerCode (fallback)
  let canCurrentUserApprove = false;
  
  if (userId && pendingStep && !acceptance.approvedAt) {
    // Path 1: Direct user ID match
    if (pendingStep.assignedToUserId === userId) {
      canCurrentUserApprove = true;
    } 
    // Path 2: Fallback - check if user's employee code matches pendingPartnerCode
    else if (acceptance.pendingPartnerCode && !pendingStep.assignedToUserId) {
      const userEmployee = await prisma.employee.findFirst({
        where: {
          WinLogon: {
            equals: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email,
          },
        },
        select: { EmpCode: true },
      });
      
      if (userEmployee?.EmpCode && 
          userEmployee.EmpCode.trim().toUpperCase() === acceptance.pendingPartnerCode.trim().toUpperCase()) {
        canCurrentUserApprove = true;
      }
    }
  }

  return {
    exists: true,
    completed: Boolean(acceptance.completedAt),
    approved: Boolean(acceptance.approvedAt),
    researchCompleted: acceptance.researchCompleted,
    researchSkipped: acceptance.researchSkipped,
    riskRating: acceptance.riskRating,
    overallRiskScore: acceptance.overallRiskScore,
    completedAt: acceptance.completedAt,
    completedBy: completedUser?.name ?? acceptance.completedBy,
    approvedAt: acceptance.approvedAt,
    approvedBy: approvedUser?.name ?? acceptance.approvedBy,
    validUntil: acceptance.validUntil,
    pendingApproverName,
    pendingPartnerCode: acceptance.pendingPartnerCode,
    approvalId: acceptance.approvalId,
    currentStepId: pendingStep?.id ?? null,
    canCurrentUserApprove,
  };
}

/**
 * Check if client acceptance is valid (exists and approved)
 */
export async function isClientAcceptanceValid(clientId: number): Promise<boolean> {
  const acceptance = await prisma.clientAcceptance.findUnique({
    where: { clientId },
    select: {
      approvedAt: true,
      validUntil: true,
    },
  });

  if (!acceptance || !acceptance.approvedAt) {
    return false;
  }

  // Check if still valid (if validUntil is set)
  if (acceptance.validUntil) {
    return new Date() < acceptance.validUntil;
  }

  return true;
}

/**
 * Determine if client needs acceptance
 * Returns true if no acceptance exists or if it has expired
 */
export async function needsClientAcceptance(clientId: number): Promise<boolean> {
  return !(await isClientAcceptanceValid(clientId));
}

/**
 * Get or create client acceptance record
 */
export async function getOrCreateClientAcceptance(
  clientId: number,
  userId: string
): Promise<ClientAcceptance> {
  // Check if client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, clientNameFull: true },
  });

  if (!client) {
    throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
  }

  // Try to find existing acceptance
  let acceptance = await prisma.clientAcceptance.findUnique({
    where: { clientId },
    include: {
      ClientAcceptanceAnswer: {
        include: {
          AcceptanceQuestion: true,
        },
      },
    },
  });

  if (!acceptance) {
    // Create new acceptance record
    acceptance = await prisma.clientAcceptance.create({
      data: {
        clientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        ClientAcceptanceAnswer: {
          include: {
            AcceptanceQuestion: true,
          },
        },
      },
    });
  }

  return acceptance as any as ClientAcceptance;
}

/**
 * Save answers for client acceptance questionnaire
 */
export async function saveClientAcceptanceAnswers(
  clientId: number,
  questionId: number,
  answer: string,
  comment: string | null,
  userId: string
): Promise<void> {
  // Get or create acceptance record
  const acceptance = await getOrCreateClientAcceptance(clientId, userId);

  // Upsert the answer
  await prisma.clientAcceptanceAnswer.upsert({
    where: {
      clientAcceptanceId_questionId: {
        clientAcceptanceId: acceptance.id,
        questionId,
      },
    },
    create: {
      clientAcceptanceId: acceptance.id,
      questionId,
      answer,
      comment,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      answer,
      comment,
      updatedAt: new Date(),
    },
  });

  // Update acceptance record timestamp
  await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: { updatedAt: new Date() },
  });
}

/**
 * Save multiple answers in a transaction for better performance (optimized with batch lookups)
 */
export async function saveClientAcceptanceAnswersBatch(
  clientId: number,
  answers: Array<{ questionKey: string; answer: string; comment?: string }>,
  userId: string
): Promise<void> {
  const acceptance = await getOrCreateClientAcceptance(clientId, userId);

  // Batch lookup all question IDs at once
  const questionKeys = answers.map((a) => a.questionKey);
  const questions = await prisma.acceptanceQuestion.findMany({
    where: {
      questionnaireType: 'CLIENT_ACCEPTANCE',
      questionKey: { in: questionKeys },
    },
    select: { id: true, questionKey: true },
  });

  // Create map for O(1) lookup
  const questionIdMap = new Map(questions.map((q) => [q.questionKey, q.id]));

  // Process all answers in a transaction
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const answerData of answers) {
      const questionId = questionIdMap.get(answerData.questionKey);
      if (!questionId) continue;

      await tx.clientAcceptanceAnswer.upsert({
        where: {
          clientAcceptanceId_questionId: {
            clientAcceptanceId: acceptance.id,
            questionId,
          },
        },
        create: {
          clientAcceptanceId: acceptance.id,
          questionId,
          answer: answerData.answer,
          comment: answerData.comment || null,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          answer: answerData.answer,
          comment: answerData.comment || null,
          updatedAt: now,
        },
      });
    }

    // Update acceptance record timestamp once
    await tx.clientAcceptance.update({
      where: { id: acceptance.id },
      data: { updatedAt: now },
    });
  });
}

/**
 * Submit client acceptance for approval
 */
export async function submitClientAcceptance(
  input: SubmitClientAcceptanceInput
): Promise<ClientAcceptance> {
  const { clientId, answers, userId, selectedPartnerCode, selectedManagerCode, selectedInchargeCode } = input;

  // Get acceptance record
  const acceptance = await getOrCreateClientAcceptance(clientId, userId);

  // Get all required questions
  const allQuestions = CLIENT_ACCEPTANCE_QUESTIONNAIRE.flatMap((section) =>
    section.questions
  );
  const requiredQuestions = allQuestions.filter((q) => q.required);

  // Ensure all questions are in the database
  await ensureQuestionsExist(allQuestions);

  // Validate all required questions are answered
  const answerKeys = Object.keys(answers);
  const missingRequired = requiredQuestions.filter(
    (q) => !answerKeys.includes(q.questionKey)
  );

  if (missingRequired.length > 0) {
    throw new AppError(
      400,
      `Missing required questions: ${missingRequired.map((q) => q.questionKey).join(', ')}`,
      ErrorCodes.VALIDATION_ERROR
    );
  }

  // Save all answers using batch method (much faster than individual saves)
  const answersToSave = Object.entries(answers).map(([questionKey, answerData]) => ({
    questionKey,
    answer: answerData.answer,
    comment: answerData.comment,
  }));

  await saveClientAcceptanceAnswersBatch(clientId, answersToSave, userId);

  // Calculate risk score
  const riskResult = calculateClientRiskScore(answers, allQuestions);

  // Update acceptance with completion data and pending team selections
  const updated = await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: {
      completedAt: new Date(),
      completedBy: userId,
      riskRating: riskResult.rating,
      overallRiskScore: riskResult.score,
      riskSummary: riskResult.summary,
      pendingPartnerCode: selectedPartnerCode || null,
      pendingManagerCode: selectedManagerCode || null,
      pendingInchargeCode: selectedInchargeCode || null,
      updatedAt: new Date(),
    },
    include: {
      ClientAcceptanceAnswer: {
        include: {
          AcceptanceQuestion: true,
        },
      },
    },
  });

  return updated as any as ClientAcceptance;
}

/**
 * Approve client acceptance (Partner only)
 */
export async function approveClientAcceptance(
  input: ApproveClientAcceptanceInput,
  providedTx?: any
): Promise<ClientAcceptance> {
  const { clientId, userId, approvalId } = input;

  // Use provided transaction or create a new one
  const executeApproval = async (tx: any) => {
    const acceptance = await tx.clientAcceptance.findUnique({
      where: { clientId },
    });

    if (!acceptance) {
      throw new AppError(
        404,
        'Client acceptance not found',
        ErrorCodes.NOT_FOUND
      );
    }

    if (!acceptance.completedAt) {
      throw new AppError(
        400,
        'Cannot approve incomplete client acceptance',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (acceptance.approvedAt) {
      // Already approved - return existing record (idempotent behavior)
      logger.info('Client acceptance already approved, skipping', { clientId });
      
      // Fetch full acceptance with relations to match return type
      const fullAcceptance = await tx.clientAcceptance.findUnique({
        where: { clientId },
        include: {
          ClientAcceptanceAnswer: {
            include: {
              AcceptanceQuestion: true,
            },
          },
          Client: true,
        },
      });
      
      return fullAcceptance as any as ClientAcceptance;
    }
    // Apply pending team changes to Client table if any exist
    if (acceptance.pendingPartnerCode || acceptance.pendingManagerCode || acceptance.pendingInchargeCode) {
      await tx.client.update({
        where: { id: acceptance.clientId },
        data: {
          ...(acceptance.pendingPartnerCode && { clientPartner: acceptance.pendingPartnerCode }),
          ...(acceptance.pendingManagerCode && { clientManager: acceptance.pendingManagerCode }),
          ...(acceptance.pendingInchargeCode && { clientIncharge: acceptance.pendingInchargeCode }),
        },
      });
      
      logger.info('Applied pending team changes from acceptance approval', {
        clientId: acceptance.clientId,
        partner: acceptance.pendingPartnerCode,
        manager: acceptance.pendingManagerCode,
        incharge: acceptance.pendingInchargeCode,
        approvedBy: userId,
      });
    }

    // Update acceptance with approval data
    const approvedAcceptance = await tx.clientAcceptance.update({
      where: { id: acceptance.id },
      data: {
        approvedAt: new Date(),
        approvedBy: userId,
        approvalId,
        teamChangesApplied: !!(acceptance.pendingPartnerCode || acceptance.pendingManagerCode || acceptance.pendingInchargeCode),
        teamChangesAppliedAt: (acceptance.pendingPartnerCode || acceptance.pendingManagerCode || acceptance.pendingInchargeCode) 
          ? new Date() 
          : null,
        // Set validity period (e.g., 1 year from approval)
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      include: {
        ClientAcceptanceAnswer: {
          include: {
            AcceptanceQuestion: true,
          },
        },
        Client: true,
      },
    });

    return approvedAcceptance;
  };

  // If a transaction is provided, use it; otherwise create a new one
  if (providedTx) {
    return await executeApproval(providedTx);
  } else {
    return await prisma.$transaction(executeApproval) as any as ClientAcceptance;
  }
}

/**
 * Invalidate client acceptance (mark for re-assessment)
 */
export async function invalidateClientAcceptance(
  clientId: number,
  reason: string
): Promise<void> {
  const acceptance = await prisma.clientAcceptance.findUnique({
    where: { clientId },
  });

  if (!acceptance) {
    return; // Nothing to invalidate
  }

  // Set validUntil to now to expire it
  await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: {
      validUntil: new Date(),
      riskSummary: `${acceptance.riskSummary || ''}\n\nInvalidated: ${reason}`,
      updatedAt: new Date(),
    },
  });
}

/**
 * Save client research data to acceptance record
 */
export async function saveClientResearchData(
  clientId: number,
  researchData: CompanyResearchResult,
  userId: string
): Promise<void> {
  const acceptance = await getOrCreateClientAcceptance(clientId, userId);
  
  await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: {
      researchData: JSON.stringify(researchData),
      researchedAt: new Date(),
      researchCompleted: true,
      researchSkipped: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark research as completed (either completed or skipped)
 */
export async function markResearchCompleted(
  clientId: number,
  skipped: boolean = false,
  userId?: string
): Promise<void> {
  // Get or create acceptance record
  const acceptance = userId 
    ? await getOrCreateClientAcceptance(clientId, userId)
    : await prisma.clientAcceptance.findUnique({
        where: { clientId },
      });

  if (!acceptance) {
    throw new AppError(
      404,
      'Client acceptance not found',
      ErrorCodes.NOT_FOUND
    );
  }

  await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: {
      researchCompleted: true,
      researchSkipped: skipped,
      updatedAt: new Date(),
    },
  });
}

/**
 * Save client team selections (pending changes until approval)
 */
export async function saveClientTeamSelections(
  clientId: number,
  selections: {
    partnerCode?: string;
    managerCode?: string;
    inchargeCode?: string;
  },
  userId: string
): Promise<void> {
  const acceptance = await getOrCreateClientAcceptance(clientId, userId);
  
  await prisma.clientAcceptance.update({
    where: { id: acceptance.id },
    data: {
      pendingPartnerCode: selections.partnerCode || null,
      pendingManagerCode: selections.managerCode || null,
      pendingInchargeCode: selections.inchargeCode || null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get client acceptance with all answers
 */
export async function getClientAcceptance(
  clientId: number
): Promise<ClientAcceptance | null> {
  const acceptance = await prisma.clientAcceptance.findUnique({
    where: { clientId },
    include: {
      ClientAcceptanceAnswer: {
        include: {
          AcceptanceQuestion: true,
        },
      },
      Client: {
        select: {
          id: true,
          clientCode: true,
          clientNameFull: true,
          groupCode: true,
          groupDesc: true,
        },
      },
    },
  });

  return acceptance as any as ClientAcceptance | null;
}

/**
 * Ensure questions exist in database (optimized with bulk operations)
 */
async function ensureQuestionsExist(
  questions: AcceptanceQuestionDef[]
): Promise<void> {
  const now = new Date();
  
  // First, try bulk create for new questions (skip duplicates)
  const questionData = questions.map((question) => ({
    questionnaireType: 'CLIENT_ACCEPTANCE',
    sectionKey: question.sectionKey,
    questionKey: question.questionKey,
    questionText: question.questionText,
    description: question.description || null,
    fieldType: question.fieldType,
    options: question.options ? JSON.stringify(question.options) : null,
    required: question.required,
    order: question.order,
    riskWeight: question.riskWeight,
    highRiskAnswers: question.highRiskAnswers
      ? JSON.stringify(question.highRiskAnswers)
      : null,
    createdAt: now,
    updatedAt: now,
  }));

  try {
    // Bulk create - skips duplicates automatically
    await prisma.acceptanceQuestion.createMany({
      data: questionData,
    });
  } catch (error) {
    // If bulk create fails, questions might already exist - that's OK
    logger.info('Bulk question create skipped (questions may already exist)');
  }

  // Update existing questions in a single transaction
  await prisma.$transaction(
    questions.map((question) =>
      prisma.acceptanceQuestion.updateMany({
        where: {
          questionnaireType: 'CLIENT_ACCEPTANCE',
          questionKey: question.questionKey,
        },
        data: {
          questionText: question.questionText,
          description: question.description || null,
          fieldType: question.fieldType,
          options: question.options ? JSON.stringify(question.options) : null,
          required: question.required,
          order: question.order,
          riskWeight: question.riskWeight,
          highRiskAnswers: question.highRiskAnswers
            ? JSON.stringify(question.highRiskAnswers)
            : null,
          updatedAt: now,
        },
      })
    )
  );
}

/**
 * Calculate client risk score
 */
function calculateClientRiskScore(
  answers: Record<string, { answer: string; comment?: string }>,
  questions: AcceptanceQuestionDef[]
): { score: number; rating: string; summary: string } {
  let totalRisk = 0;
  let maxPossibleRisk = 0;
  const highRiskItems: string[] = [];

  for (const question of questions) {
    const answer = answers[question.questionKey]?.answer;
    if (!answer || question.riskWeight === 0) continue;

    maxPossibleRisk += question.riskWeight * 10;

    // Check if answer is high risk
    if (
      question.highRiskAnswers &&
      question.highRiskAnswers.includes(answer)
    ) {
      totalRisk += question.riskWeight * 10;
      highRiskItems.push(question.questionText);
    }
  }

  const score = maxPossibleRisk > 0 ? (totalRisk / maxPossibleRisk) * 100 : 0;

  let rating: string;
  if (score < 30) {
    rating = 'LOW';
  } else if (score < 60) {
    rating = 'MEDIUM';
  } else {
    rating = 'HIGH';
  }

  const summary =
    highRiskItems.length > 0
      ? `Risk Rating: ${rating} (${score.toFixed(1)}%). High-risk factors: ${highRiskItems.slice(0, 3).join('; ')}${highRiskItems.length > 3 ? ` and ${highRiskItems.length - 3} more` : ''}.`
      : `Risk Rating: ${rating} (${score.toFixed(1)}%). No significant high-risk factors identified.`;

  return { score, rating, summary };
}
