import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAdjustmentId, getTaxAdjustmentOrThrow, successResponse } from '@/lib/apiUtils';
import { handleApiError, AppError, ErrorCodes } from '@/lib/errorHandler';

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Fetch a specific tax adjustment
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const adjustmentId = parseAdjustmentId(params?.adjustmentId);

    const adjustment = await getTaxAdjustmentOrThrow(adjustmentId, {
      documents: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    });

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

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Fetch Tax Adjustment');
  }
}

/**
 * PATCH /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Update a tax adjustment
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const adjustmentId = parseAdjustmentId(params?.adjustmentId);
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

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Update Tax Adjustment');
  }
}

/**
 * DELETE /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Delete a specific tax adjustment
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const adjustmentId = parseAdjustmentId(params?.adjustmentId);

    // Delete associated documents first
    await prisma.adjustmentDocument.deleteMany({
      where: { taxAdjustmentId: adjustmentId },
    });

    // Delete the adjustment
    await prisma.taxAdjustment.delete({
      where: { id: adjustmentId },
    });

    return NextResponse.json(successResponse({ 
      message: 'Tax adjustment deleted successfully' 
    }));
  } catch (error) {
    return handleApiError(error, 'Delete Tax Adjustment');
  }
}


