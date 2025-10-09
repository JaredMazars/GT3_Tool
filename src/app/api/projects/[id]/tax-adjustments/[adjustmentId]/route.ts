import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Fetch a specific tax adjustment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
    const adjustmentId = parseInt(params.adjustmentId);

    const adjustment = await prisma.taxAdjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        documents: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: 'Tax adjustment not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const response = {
      ...adjustment,
      calculationDetails: adjustment.calculationDetails 
        ? JSON.parse(adjustment.calculationDetails)
        : null,
      extractedData: adjustment.extractedData
        ? JSON.parse(adjustment.extractedData)
        : null,
      sourceDocuments: adjustment.sourceDocuments
        ? JSON.parse(adjustment.sourceDocuments)
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tax adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax adjustment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Update a tax adjustment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
    const adjustmentId = parseInt(params.adjustmentId);
    const body = await request.json();

    const {
      type,
      description,
      amount,
      status,
      sarsSection,
      notes,
      calculationDetails,
      extractedData,
      confidenceScore,
    } = body;

    // Build update data object
    const updateData: any = {};
    
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status !== undefined) updateData.status = status;
    if (sarsSection !== undefined) updateData.sarsSection = sarsSection;
    if (notes !== undefined) updateData.notes = notes;
    if (confidenceScore !== undefined) updateData.confidenceScore = parseFloat(confidenceScore);
    
    if (calculationDetails !== undefined) {
      updateData.calculationDetails = JSON.stringify(calculationDetails);
    }
    if (extractedData !== undefined) {
      updateData.extractedData = JSON.stringify(extractedData);
    }

    // If status is being changed to MODIFIED, update the relevant fields
    if (status === 'MODIFIED' && (amount !== undefined || description !== undefined)) {
      updateData.status = 'MODIFIED';
    }

    const adjustment = await prisma.taxAdjustment.update({
      where: { id: adjustmentId },
      data: updateData,
      include: {
        documents: true,
      },
    });

    // Parse JSON fields for response
    const response = {
      ...adjustment,
      calculationDetails: adjustment.calculationDetails 
        ? JSON.parse(adjustment.calculationDetails)
        : null,
      extractedData: adjustment.extractedData
        ? JSON.parse(adjustment.extractedData)
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating tax adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to update tax adjustment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Delete a specific tax adjustment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
    const adjustmentId = parseInt(params.adjustmentId);

    // Delete associated documents first
    await prisma.adjustmentDocument.deleteMany({
      where: { taxAdjustmentId: adjustmentId },
    });

    // Delete the adjustment
    await prisma.taxAdjustment.delete({
      where: { id: adjustmentId },
    });

    return NextResponse.json({ 
      message: 'Tax adjustment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting tax adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax adjustment' },
      { status: 500 }
    );
  }
}


