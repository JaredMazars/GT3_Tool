/**
 * Client Balance Calculation Utilities
 * 
 * Shared logic for calculating WIP and debtor balances from transaction tables.
 * Used by both client API and balance endpoints to ensure consistency.
 */

/**
 * Categorize a transaction type using exact TType matching
 * 
 * Simplified logic using ONLY the TType field:
 * - T = Time
 * - D = Disbursement
 * - ADJ = Adjustment
 * - P = Provision
 * - F = Fee
 * 
 * Exported for use across all analytics endpoints to ensure consistent transaction categorization
 */
export function categorizeTransaction(tType: string): {
  isTime: boolean;
  isDisbursement: boolean;
  isFee: boolean;
  isAdjustment: boolean;
  isProvision: boolean;
} {
  const tTypeUpper = tType.toUpperCase();
  
  return {
    isTime: tTypeUpper === 'T',
    isDisbursement: tTypeUpper === 'D',
    isFee: tTypeUpper === 'F',
    isAdjustment: tTypeUpper === 'ADJ',
    isProvision: tTypeUpper === 'P',
  };
}

export interface WIPTransaction {
  Amount: number | null;
  TType: string;
  GSTaskID?: string; // Optional for task-level grouping
}

export interface WIPBalances {
  time: number;
  adjustments: number; // Single category for all adjustments
  disbursements: number;
  fees: number;
  provision: number;
  grossWip: number;
  netWip: number;
  balWIP: number; // Same as netWip, for backwards compatibility
  balTime: number;
  balDisb: number;
}

/**
 * Calculate WIP balances from WIPTransactions
 * 
 * Uses exact TType matching with single adjustments category
 * Formula: Gross WIP = Time + Adjustments + Disbursements - Fees
 *          Net WIP = Gross WIP + Provision
 * 
 * @param transactions - Array of WIP transaction records
 * @returns Aggregated WIP balances with detailed breakdown
 */
export function calculateWIPBalances(transactions: WIPTransaction[]): WIPBalances {
  let time = 0;
  let adjustments = 0;
  let disbursements = 0;
  let fees = 0;
  let provision = 0;

  transactions.forEach((transaction) => {
    const amount = transaction.Amount || 0;
    const category = categorizeTransaction(transaction.TType);

    if (category.isProvision) {
      provision += amount;
    } else if (category.isFee) {
      fees += amount;
    } else if (category.isAdjustment) {
      adjustments += amount; // All ADJ in single category
    } else if (category.isTime) {
      time += amount;
    } else if (category.isDisbursement) {
      disbursements += amount;
    }
  });

  // Gross WIP = Time + Adjustments + Disbursements - Fees
  const grossWip = time + adjustments + disbursements - fees;
  
  // Net WIP = Gross WIP + Provision
  const netWip = grossWip + provision;

  return {
    time,
    adjustments,
    disbursements,
    fees,
    provision,
    grossWip,
    netWip,
    balWIP: netWip,
    balTime: time + adjustments - fees, // Time-related balances
    balDisb: disbursements,
  };
}

/**
 * Calculate WIP balances grouped by task
 * 
 * @param transactions - Array of WIP transaction records with GSTaskID
 * @returns Map of GSTaskID to WIP balances
 */
export function calculateWIPByTask(
  transactions: WIPTransaction[]
): Map<string, WIPBalances> {
  // Group transactions by task
  const grouped = new Map<string, WIPTransaction[]>();
  
  transactions.forEach((txn) => {
    if (!txn.GSTaskID) return;
    if (!grouped.has(txn.GSTaskID)) {
      grouped.set(txn.GSTaskID, []);
    }
    grouped.get(txn.GSTaskID)!.push(txn);
  });
  
  // Calculate balances for each task
  const result = new Map<string, WIPBalances>();
  grouped.forEach((txns, taskId) => {
    result.set(taskId, calculateWIPBalances(txns));
  });
  
  return result;
}




























