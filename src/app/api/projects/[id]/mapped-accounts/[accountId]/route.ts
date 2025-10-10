import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determineSectionAndSubsection } from '@/app/api/map/route';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; accountId: string } }
) {
  try {
    const data = await request.json();
    
    // If sarsItem is being updated, recalculate section and subsection
    if (data.sarsItem) {
      // Fetch the current account to get the balance
      const currentAccount = await prisma.mappedAccount.findUnique({
        where: {
          id: parseInt(params.accountId),
          projectId: parseInt(params.id),
        },
      });

      if (!currentAccount) {
        return NextResponse.json(
          { error: 'Mapped account not found' },
          { status: 404 }
        );
      }

      // Determine section and subsection based on new sarsItem and current balance
      const { section, subsection } = determineSectionAndSubsection(
        data.sarsItem,
        currentAccount.balance
      );

      // Add section and subsection to the update data
      data.section = section;
      data.subsection = subsection;
    }

    const mappedAccount = await prisma.mappedAccount.update({
      where: {
        id: parseInt(params.accountId),
        projectId: parseInt(params.id),
      },
      data,
    });

    return NextResponse.json(mappedAccount);
  } catch (error) {
    console.error('Error updating mapped account:', error);
    return NextResponse.json(
      { error: 'Failed to update mapped account' },
      { status: 500 }
    );
  }
} 