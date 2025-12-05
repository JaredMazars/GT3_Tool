import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TaxAdjustmentEngine } from '@/lib/services/tax/taxAdjustmentEngine';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const GenerateSuggestionsSchema = z.object({
  useAI: z.boolean().optional(),
  autoSave: z.boolean().optional(),
});

/**
 * POST /api/tasks/[id]/tax-adjustments/suggestions
 * Generate AI-powered tax adjustment suggestions
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Check project access (requires EDITOR role or higher for generating suggestions)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = GenerateSuggestionsSchema.parse(body);
    const { useAI = true, autoSave = false } = validated;

    // Fetch mapped accounts for this project
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: { taskId },
    });

    if (mappedAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No mapped accounts found. Please complete account mapping first.' },
        { status: 400 }
      );
    }

    // Fetch existing adjustments (excluding SUGGESTED to avoid checking against ones about to be replaced)
    const existingAdjustments = await prisma.taxAdjustment.findMany({
      where: {
        taskId,
        status: {
          in: ['APPROVED', 'MODIFIED', 'REJECTED']
        }
      },
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        sarsSection: true,
        status: true,
      }
    });

    // Generate suggestions using the tax adjustment engine
    // Convert null to undefined for sarsSection
    const existingAdjustmentsFormatted = existingAdjustments.map(adj => ({
      ...adj,
      sarsSection: adj.sarsSection ?? undefined
    }));
    
    const suggestions = await TaxAdjustmentEngine.analyzeMappedAccounts(
      mappedAccounts,
      useAI,
      existingAdjustmentsFormatted
    );

    // Optionally save suggestions to database
    if (autoSave) {
      // Delete existing SUGGESTED adjustments to avoid duplicates
      await prisma.taxAdjustment.deleteMany({
        where: {
          taskId,
          status: 'SUGGESTED',
        },
      });

      // Create new suggestions
      for (const suggestion of suggestions) {
        await prisma.taxAdjustment.create({
          data: {
            taskId,
            type: suggestion.type,
            description: suggestion.description,
            amount: suggestion.amount,
            status: 'SUGGESTED',
            sarsSection: suggestion.sarsSection,
            confidenceScore: suggestion.confidenceScore,
            calculationDetails: JSON.stringify(suggestion.calculationDetails),
            notes: suggestion.reasoning,
          },
        });
      }

      // Fetch and return the saved adjustments
      const savedAdjustments = await prisma.taxAdjustment.findMany({
        where: {
          taskId,
          status: 'SUGGESTED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json({
        suggestions: savedAdjustments,
        count: savedAdjustments.length,
        saved: true,
      });
    }

    // Return suggestions without saving
    return NextResponse.json({
      suggestions,
      count: suggestions.length,
      saved: false,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/tax-adjustments/suggestions');
  }
}

/**
 * GET /api/tasks/[id]/tax-adjustments/suggestions
 * Get existing suggested adjustments
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const suggestions = await prisma.taxAdjustment.findMany({
      where: {
        taskId,
        status: 'SUGGESTED',
      },
      orderBy: {
        confidenceScore: 'desc',
      },
    });

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[id]/tax-adjustments/suggestions');
  }
}


