import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TaxAdjustmentEngine } from '@/lib/taxAdjustmentEngine';

const prisma = new PrismaClient();

/**
 * GET /api/projects/[id]/tax-adjustments
 * Fetch all tax adjustments for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const adjustments = await prisma.taxAdjustment.findMany({
      where,
      include: {
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching tax adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax adjustments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/tax-adjustments
 * Create a new tax adjustment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
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
    if (!['DEBIT', 'CREDIT', 'ALLOWANCE'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be DEBIT, CREDIT, or ALLOWANCE' },
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

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error('Error creating tax adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to create tax adjustment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tax-adjustments
 * Delete all tax adjustments for a project (use with caution)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const result = await prisma.taxAdjustment.deleteMany({
      where,
    });

    return NextResponse.json({ 
      message: `Deleted ${result.count} tax adjustments`,
      count: result.count 
    });
  } catch (error) {
    console.error('Error deleting tax adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax adjustments' },
      { status: 500 }
    );
  }
}


