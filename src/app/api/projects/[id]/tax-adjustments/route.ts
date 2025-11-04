import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TaxAdjustmentEngine } from '@/lib/taxAdjustmentEngine';
import { parseProjectId, successResponse } from '@/lib/apiUtils';
import { handleApiError } from '@/lib/errorHandler';

/**
 * GET /api/projects/[id]/tax-adjustments
 * Fetch all tax adjustments for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const adjustments = await prisma.taxAdjustment.findMany({
      where,
      include: {
        documents: {
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

    return NextResponse.json(successResponse(adjustments));
  } catch (error) {
    return handleApiError(error, 'Fetch Tax Adjustments');
  }
}

/**
 * POST /api/projects/[id]/tax-adjustments
 * Create a new tax adjustment
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
    const body = await request.json();

    const {
      type,
      description,
      amount,
      status = 'SUGGESTED',
      sarsSection,
      notes,
      calculationDetails,
      confidenceScore,
    } = body;

    // Validate required fields
    if (!type || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, description, amount' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['DEBIT', 'CREDIT', 'ALLOWANCE', 'RECOUPMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be DEBIT, CREDIT, ALLOWANCE, or RECOUPMENT' },
        { status: 400 }
      );
    }

    const adjustment = await prisma.taxAdjustment.create({
      data: {
        projectId,
        type,
        description,
        amount: parseFloat(amount),
        status,
        sarsSection,
        notes,
        calculationDetails: calculationDetails ? JSON.stringify(calculationDetails) : null,
        confidenceScore: confidenceScore ? parseFloat(confidenceScore) : null,
      },
      include: {
        documents: true,
      },
    });

    return NextResponse.json(successResponse(adjustment), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Tax Adjustment');
  }
}

/**
 * DELETE /api/projects/[id]/tax-adjustments
 * Delete all tax adjustments for a project (use with caution)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const result = await prisma.taxAdjustment.deleteMany({
      where,
    });

    return NextResponse.json(successResponse({ 
      message: `Deleted ${result.count} tax adjustments`,
      count: result.count 
    }));
  } catch (error) {
    return handleApiError(error, 'Delete Tax Adjustments');
  }
}


