import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseProjectId, getProjectOrThrow, successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/projects/[id]/trial-balance
 * Get trial balance data for a project
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
    
    // Verify project exists
    await getProjectOrThrow(projectId);
    
    // Fetch all mapped accounts for this project
    const accounts = await prisma.mappedAccount.findMany({
      where: { projectId },
      orderBy: [
        { section: 'asc' },
        { accountCode: 'asc' },
      ],
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        balance: true,
        priorYearBalance: true,
        sarsItem: true,
        section: true,
        subsection: true,
      },
    });

    // Calculate totals
    const currentYearTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const priorYearTotal = accounts.reduce((sum, acc) => sum + acc.priorYearBalance, 0);

    const trialBalanceData = {
      accounts,
      totals: {
        currentYear: currentYearTotal,
        priorYear: priorYearTotal,
      },
    };

    return NextResponse.json(successResponse(trialBalanceData));
  } catch (error) {
    return handleApiError(error, 'Get Trial Balance');
  }
}

