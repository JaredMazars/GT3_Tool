/**
 * Opening Balance Calculator
 * 
 * Efficiently calculates WIP opening balances from database aggregates
 * instead of fetching and processing thousands of individual transactions.
 * 
 * IMPORTANT: This must match the calculation logic in calculateWIPBalances()
 */

import { categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';

type AggregateResult = {
  TType: string;
  TaskServLine?: string; // Optional for task-level aggregates
  _sum: {
    Amount: number | null;
  };
};

/**
 * Calculate opening WIP balance from aggregated transaction data
 * 
 * Uses exact TType matching with single adjustments category
 * Formula: Gross WIP = Time + Adjustments + Disbursements - Fees
 *          Net WIP = Gross WIP + Provision
 * 
 * @param aggregates - Aggregated transaction data grouped by TType
 * @returns Opening WIP balance (Net WIP)
 */
export function calculateOpeningBalanceFromAggregates(
  aggregates: AggregateResult[]
): number {
  let time = 0;
  let adjustments = 0;
  let disbursements = 0;
  let fees = 0;
  let provision = 0;

  for (const agg of aggregates) {
    const amount = agg._sum.Amount ?? 0;
    const category = categorizeTransaction(agg.TType);

    if (category.isProvision) {
      provision += amount;
    } else if (category.isFee) {
      fees += amount;
    } else if (category.isAdjustment) {
      adjustments += amount;
    } else if (category.isTime) {
      time += amount;
    } else if (category.isDisbursement) {
      disbursements += amount;
    }
  }

  // Calculate WIP using simplified formula
  // Gross WIP = Time + Adjustments + Disbursements - Fees
  const grossWip = time + adjustments + disbursements - fees;
  
  // Net WIP = Gross WIP + Provision
  const netWip = grossWip + provision;

  return netWip;
}

