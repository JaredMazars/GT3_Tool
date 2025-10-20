import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determineSectionAndSubsection } from '@/app/api/map/route';
import { handleApiError } from '@/lib/errorHandler';
import { parseProjectId, successResponse } from '@/lib/apiUtils';

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
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const projectId = parseProjectId(params?.id);
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