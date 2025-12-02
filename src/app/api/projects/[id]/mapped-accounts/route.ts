import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { determineSectionAndSubsection } from '@/lib/services/opinions/sectionMapper';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseProjectId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    
    // Check project access (any role can view)
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        projectId,
      },
      orderBy: {
        accountCode: 'asc',
      },
    });

    return NextResponse.json(successResponse(mappedAccounts));
  } catch (error) {
    return handleApiError(error, 'Get Mapped Accounts');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    
    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // If sarsItem and balance are provided, determine section and subsection
    if (data.sarsItem && typeof data.balance === 'number') {
      const { section, subsection } = determineSectionAndSubsection(
        data.sarsItem,
        data.balance
      );
      data.section = section;
      data.subsection = subsection;
    }

    const mappedAccount = await prisma.mappedAccount.create({
      data: {
        ...data,
        projectId,
      },
    });

    return NextResponse.json(successResponse(mappedAccount), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Mapped Account');
  }
} 