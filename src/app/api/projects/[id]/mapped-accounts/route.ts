import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determineSectionAndSubsection } from '@/app/api/map/route';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        projectId: parseInt(params.id),
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
        projectId: parseInt(params.id),
      },
    });

    return NextResponse.json(mappedAccount);
  } catch (error) {
    console.error('Error creating mapped account:', error);
    return NextResponse.json(
      { error: 'Failed to create mapped account' },
      { status: 500 }
    );
  }
} 