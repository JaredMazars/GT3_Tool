import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { determineSectionAndSubsection } from '@/lib/services/opinions/sectionMapper';
import { handleApiError } from '@/lib/utils/errorHandler';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';

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
    const taskId = parseTaskId(params?.id);
    
    // Check project access (any role can view)
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        taskId,
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
    const taskId = parseTaskId(params?.id);
    
    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
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
        taskId,
      },
    });

    return NextResponse.json(successResponse(mappedAccount), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Mapped Account');
  }
} 