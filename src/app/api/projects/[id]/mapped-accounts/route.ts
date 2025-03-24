import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        accountCode: 'asc',
      },
    });

    return NextResponse.json(mappedAccounts);
  } catch (error) {
    console.error('Error fetching mapped accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mapped accounts' },
      { status: 500 }
    );
  }
} 