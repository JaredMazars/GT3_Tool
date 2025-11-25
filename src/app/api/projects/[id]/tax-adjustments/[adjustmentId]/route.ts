import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseAdjustmentId, parseProjectId, getTaxAdjustmentOrThrow, successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';

/**
 * GET /api/projects/[id]/tax-adjustments/[adjustmentId]
 * Fetch a specific tax adjustment
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
    const adjustmentId = parseAdjustmentId(params?.adjustmentId);
    
    // Check project access (any role can view)
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adjustment = await getTaxAdjustmentOrThrow(adjustmentId, {
      AdjustmentDocument: true,
      Project: {
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
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
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
    
    // Check if status is being changed to APPROVED or REJECTED - requires REVIEWER role
    if (status && (status === 'APPROVED' || status === 'REJECTED')) {
      const hasAccess = await checkProjectAccess(user.id, projectId, 'REVIEWER');
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Only reviewers can approve or reject tax adjustments' },
          { status: 403 }
        );
      }
    } else {
      // Other edits require EDITOR role or higher
      const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build update data object
    interface UpdateData {
      type?: string;
      description?: string;
      amount?: number;
      status?: string;
      sarsSection?: string;
      notes?: string;
      confidenceScore?: number;
      calculationDetails?: string;
      extractedData?: string;
    }

    const updateData: UpdateData = {};
    
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
        AdjustmentDocument: true,
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
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
    const adjustmentId = parseAdjustmentId(params?.adjustmentId);
    
    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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


