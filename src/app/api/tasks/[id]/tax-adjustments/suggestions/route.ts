import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { TaxAdjustmentEngine } from '@/lib/tools/tax-calculation/services/taxAdjustmentEngine';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

const GenerateSuggestionsSchema = z.object({
  useAI: z.boolean().optional().default(true),
  autoSave: z.boolean().optional().default(false),
}).strict();

// Limit for mapped accounts to prevent excessive processing
const MAX_MAPPED_ACCOUNTS = 500;

/**
 * POST /api/tasks/[id]/tax-adjustments/suggestions
 * Generate AI-powered tax adjustment suggestions
 */
export const POST = secureRoute.aiWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  taskRole: 'EDITOR',
  schema: GenerateSuggestionsSchema,
  handler: async (request, { params, data }) => {
    const taskId = parseTaskId(params.id);
    const { useAI, autoSave } = data;

    // Fetch mapped accounts for this task (with limit)
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: { taskId },
      take: MAX_MAPPED_ACCOUNTS,
      orderBy: { id: 'asc' },
    });

    if (mappedAccounts.length === 0) {
      throw new AppError(
        400,
        'No mapped accounts found. Please complete account mapping first.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Fetch existing adjustments (excluding SUGGESTED to avoid checking against ones about to be replaced)
    const existingAdjustments = await prisma.taxAdjustment.findMany({
      where: {
        taskId,
        status: {
          in: ['APPROVED', 'MODIFIED', 'REJECTED'],
        },
      },
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        sarsSection: true,
        status: true,
      },
      take: 200, // Limit existing adjustments
    });

    // Generate suggestions using the tax adjustment engine
    // Convert null to undefined for sarsSection
    const existingAdjustmentsFormatted = existingAdjustments.map((adj) => ({
      ...adj,
      sarsSection: adj.sarsSection ?? undefined,
    }));

    const suggestions = await TaxAdjustmentEngine.analyzeMappedAccounts(
      mappedAccounts,
      useAI,
      existingAdjustmentsFormatted
    );

    // Optionally save suggestions to database
    if (autoSave) {
      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Delete existing SUGGESTED adjustments to avoid duplicates
        await tx.taxAdjustment.deleteMany({
          where: {
            taskId,
            status: 'SUGGESTED',
          },
        });

        // Create new suggestions using createMany for efficiency
        if (suggestions.length > 0) {
          await tx.taxAdjustment.createMany({
            data: suggestions.map((suggestion) => ({
              taskId,
              type: suggestion.type,
              description: suggestion.description,
              amount: suggestion.amount,
              status: 'SUGGESTED',
              sarsSection: suggestion.sarsSection,
              confidenceScore: suggestion.confidenceScore,
              calculationDetails: JSON.stringify(suggestion.calculationDetails),
              notes: suggestion.reasoning,
              updatedAt: new Date(),
            })),
          });
        }
      });

      // Fetch and return the saved adjustments
      const savedAdjustments = await prisma.taxAdjustment.findMany({
        where: {
          taskId,
          status: 'SUGGESTED',
        },
        select: {
          id: true,
          type: true,
          description: true,
          amount: true,
          status: true,
          sarsSection: true,
          confidenceScore: true,
          notes: true,
          createdAt: true,
        },
        orderBy: [
          { confidenceScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 100,
      });

      return NextResponse.json(
        successResponse({
          suggestions: savedAdjustments,
          count: savedAdjustments.length,
          saved: true,
        })
      );
    }

    // Return suggestions without saving
    return NextResponse.json(
      successResponse({
        suggestions,
        count: suggestions.length,
        saved: false,
      })
    );
  },
});

/**
 * GET /api/tasks/[id]/tax-adjustments/suggestions
 * Get existing suggested adjustments
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.id);

    const suggestions = await prisma.taxAdjustment.findMany({
      where: {
        taskId,
        status: 'SUGGESTED',
      },
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        status: true,
        sarsSection: true,
        confidenceScore: true,
        notes: true,
        calculationDetails: true,
        createdAt: true,
      },
      orderBy: [
        { confidenceScore: 'desc' },
        { id: 'desc' }, // Secondary sort for deterministic ordering
      ],
      take: 100, // Limit results
    });

    // Parse JSON fields
    const parsedSuggestions = suggestions.map((s) => ({
      ...s,
      calculationDetails: s.calculationDetails
        ? JSON.parse(s.calculationDetails)
        : null,
    }));

    return NextResponse.json(
      successResponse({
        suggestions: parsedSuggestions,
        count: suggestions.length,
      })
    );
  },
});
