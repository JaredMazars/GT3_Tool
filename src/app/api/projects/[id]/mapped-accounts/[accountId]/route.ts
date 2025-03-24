import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; accountId: string } }
) {
  try {
    const { sarsItem } = await request.json();
    const projectId = parseInt(params.id);
    const accountId = parseInt(params.accountId);

    if (!sarsItem) {
      return NextResponse.json(
        { error: 'SARS item is required' },
        { status: 400 }
      );
    }

    const updatedMapping = await prisma.mappedAccount.update({
      where: {
        id: accountId,
        projectId: projectId,
      },
      data: {
        sarsItem: sarsItem,
      },
    });

    return NextResponse.json(updatedMapping);
  } catch (error) {
    console.error('Error updating mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    );
  }
} 