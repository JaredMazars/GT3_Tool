import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * DELETE /api/projects/[id]/permanent
 * Permanently delete a project and all its related data from the database
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = parseInt(params.id, 10);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project and all related data in a transaction to ensure atomicity
    // Order: AdjustmentDocuments -> TaxAdjustments -> MappedAccounts -> AITaxReport -> Project
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Delete adjustment documents first (they reference both Project and TaxAdjustment)
        await tx.adjustmentDocument.deleteMany({
          where: { projectId: projectId },
        });

        // 2. Delete tax adjustments (they reference Project)
        await tx.taxAdjustment.deleteMany({
          where: { projectId: projectId },
        });

        // 3. Delete mapped accounts (they reference Project)
        await tx.mappedAccount.deleteMany({
          where: { projectId: projectId },
        });

        // 4. Delete AI tax reports (they reference Project)
        await tx.aITaxReport.deleteMany({
          where: { projectId: projectId },
        });

        // 5. Finally delete the project itself
        await tx.project.delete({
          where: { id: projectId },
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Project permanently deleted successfully'
      });
    } catch (transactionError) {
      console.error('Error in delete transaction:', transactionError);
      throw transactionError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('Error permanently deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to permanently delete project' },
      { status: 500 }
    );
  }
}
