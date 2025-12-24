import { prisma } from '@/lib/db/prisma';
import type { TaskId } from '@/types/branded';

export interface CreateAdjustmentInput {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status?: string;
  sarsSection?: string;
  notes?: string;
  calculationDetails?: Record<string, any>;
  confidenceScore?: number;
}

export interface UpdateAdjustmentInput {
  type?: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description?: string;
  amount?: number;
  status?: string;
  sarsSection?: string;
  notes?: string;
}

/**
 * Get all tax adjustments for a task
 */
export async function getTaxAdjustments(taskId: TaskId, status?: string) {
  const where: any = { taskId };
  if (status) {
    where.status = status;
  }

  const adjustments = await prisma.taxAdjustment.findMany({
    where,
    include: {
      AdjustmentDocument: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          extractionStatus: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return adjustments;
}

/**
 * Create a new tax adjustment
 */
export async function createTaxAdjustment(
  taskId: TaskId,
  input: CreateAdjustmentInput
) {
  const {
    type,
    description,
    amount,
    status = 'SUGGESTED',
    sarsSection,
    notes,
    calculationDetails,
    confidenceScore,
  } = input;

  // Validate required fields
  if (!type || !description || amount === undefined) {
    throw new Error('Missing required fields: type, description, amount');
  }

  // Validate type
  if (!['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT'].includes(type)) {
    throw new Error('Invalid type. Must be DEBIT, CREDIT, ALLOWANCE, or RECOUPMENT');
  }

  const adjustment = await prisma.taxAdjustment.create({
    data: {
      taskId,
      type,
      description,
      amount: parseFloat(amount.toString()),
      status,
      sarsSection,
      notes,
      calculationDetails: calculationDetails ? JSON.stringify(calculationDetails) : null,
      confidenceScore: confidenceScore ? parseFloat(confidenceScore.toString()) : null,
    },
    include: {
      AdjustmentDocument: true,
    },
  });

  return adjustment;
}

/**
 * Update a tax adjustment
 */
export async function updateTaxAdjustment(
  adjustmentId: number,
  input: UpdateAdjustmentInput
) {
  const adjustment = await prisma.taxAdjustment.update({
    where: { id: adjustmentId },
    data: {
      ...(input.type && { type: input.type }),
      ...(input.description && { description: input.description }),
      ...(input.amount !== undefined && { amount: parseFloat(input.amount.toString()) }),
      ...(input.status && { status: input.status }),
      ...(input.sarsSection !== undefined && { sarsSection: input.sarsSection }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: {
      AdjustmentDocument: true,
    },
  });

  return adjustment;
}

/**
 * Delete a tax adjustment
 */
export async function deleteTaxAdjustment(adjustmentId: number) {
  await prisma.taxAdjustment.delete({
    where: { id: adjustmentId },
  });
}

/**
 * Delete all tax adjustments for a task
 */
export async function deleteAllTaxAdjustments(taskId: TaskId, status?: string) {
  interface DeleteWhereClause {
    taskId: TaskId;
    status?: string;
  }
  const where: DeleteWhereClause = { taskId };
  if (status) {
    where.status = status;
  }

  const result = await prisma.taxAdjustment.deleteMany({
    where,
  });

  return {
    message: `Deleted ${result.count} tax adjustments`,
    count: result.count,
  };
}

/**
 * Get a single tax adjustment
 */
export async function getTaxAdjustment(adjustmentId: number) {
  const adjustment = await prisma.taxAdjustment.findUnique({
    where: { id: adjustmentId },
    include: {
      AdjustmentDocument: true,
    },
  });

  return adjustment;
}







































