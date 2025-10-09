import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TaxAdjustment {
  type: string;
  description: string;
  amount: number;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the project's income statement data (only income statement accounts)
    const mappedAccounts = await prisma.mappedAccount.findMany({
      where: {
        projectId: parseInt(params.id),
        section: 'Income Statement', // Only include income statement accounts
      },
      select: {
        balance: true,
      },
    });

    // Calculate net profit from income statement accounts only
    // Note: In accounting, income accounts are credits (negative), expenses are debits (positive)
    // A net credit balance (negative sum) represents profit, so we negate to show profit as positive
    const rawBalance = mappedAccounts.reduce((sum: number, account: { balance: number }) => 
      sum + account.balance, 0);
    const netProfit = -rawBalance; // Convert credit balance (profit) to positive amount

    // Get tax adjustments for this project
    const taxAdjustments = await prisma.taxAdjustment.findMany({
      where: {
        projectId: parseInt(params.id),
      },
      select: {
        type: true,
        description: true,
        amount: true,
      },
    });

    // Calculate total adjustments
    const totalDebitAdjustments = taxAdjustments
      .filter((adj: TaxAdjustment) => adj.type === 'DEBIT')
      .reduce((sum: number, adj: TaxAdjustment) => sum + adj.amount, 0);

    const totalCreditAdjustments = taxAdjustments
      .filter((adj: TaxAdjustment) => adj.type === 'CREDIT')
      .reduce((sum: number, adj: TaxAdjustment) => sum + adj.amount, 0);

    const totalAllowances = taxAdjustments
      .filter((adj: TaxAdjustment) => adj.type === 'ALLOWANCE')
      .reduce((sum: number, adj: TaxAdjustment) => sum + adj.amount, 0);

    // Calculate final profit/loss
    const calculatedProfit = netProfit + totalDebitAdjustments - Math.abs(totalCreditAdjustments) + totalAllowances;

    return NextResponse.json({
      netProfit,
      debitAdjustments: taxAdjustments.filter((adj: TaxAdjustment) => adj.type === 'DEBIT'),
      creditAdjustments: taxAdjustments.filter((adj: TaxAdjustment) => adj.type === 'CREDIT'),
      allowances: taxAdjustments.filter((adj: TaxAdjustment) => adj.type === 'ALLOWANCE'),
      calculatedProfit,
    });
  } catch (error) {
    console.error('Error fetching tax calculation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax calculation' },
      { status: 500 }
    );
  }
} 