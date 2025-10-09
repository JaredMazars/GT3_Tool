import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TaxAdjustmentEngine } from '@/lib/taxAdjustmentEngine';

const prisma = new PrismaClient();

/**
 * POST /api/projects/[id]/tax-adjustments/suggestions
 * Generate AI-powered tax adjustment suggestions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const body = await request.json();
    const { useAI = true, autoSave = false } = body;

    // Fetch mapped accounts for this project
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: { projectId },
    });

    if (mappedAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No mapped accounts found. Please complete account mapping first.' },
        { status: 400 }
      );
    }

    // Generate suggestions using the tax adjustment engine
    const suggestions = await TaxAdjustmentEngine.analyzeMappedAccounts(
      mappedAccounts,
      useAI
    );

    // Optionally save suggestions to database
    if (autoSave) {
      // Delete existing SUGGESTED adjustments to avoid duplicates
      await prisma.taxAdjustment.deleteMany({
        where: {
          projectId,
          status: 'SUGGESTED',
        },
      });

      // Create new suggestions
      for (const suggestion of suggestions) {
        await prisma.taxAdjustment.create({
          data: {
            projectId,
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
          projectId,
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
    console.error('Error generating tax adjustment suggestions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/tax-adjustments/suggestions
 * Get existing suggested adjustments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);

    const suggestions = await prisma.taxAdjustment.findMany({
      where: {
        projectId,
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
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}


