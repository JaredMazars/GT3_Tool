/**
 * Client Balance Calculation Utilities
 * 
 * Shared logic for calculating WIP and debtor balances from transaction tables.
 * Used by both client API and balance endpoints to ensure consistency.
 */

/**
 * Transaction Type Classification
 * Based on actual database TType codes
 * 
 * Exported for use across all analytics endpoints to ensure consistent transaction categorization
 */
export const TTYPE_CATEGORIES = {
  TIME: ['T', 'TI', 'TIM'], // Time transactions
  DISBURSEMENT: ['D', 'DI', 'DIS'], // Disbursement transactions
  FEE: ['F', 'FEE'], // Fee transactions (reversed) - THIS IS KEY: recognizes both 'F' and 'FEE'
  ADJUSTMENT: ['ADJ'], // Adjustment transactions (differentiated by TranType)
  PROVISION: ['P', 'PRO'], // Provision transactions
};

/**
 * Categorize a transaction type
 * 
 * Exported for use across all analytics endpoints to ensure consistent transaction categorization
 * This ensures profitability and graphs tabs show the same data
 */
export function categorizeTransaction(tType: string, tranType?: string): {
  isTime: boolean;
  isDisbursement: boolean;
  isFee: boolean;
  isAdjustment: boolean;
  isProvision: boolean;
} {
  const tTypeUpper = tType.toUpperCase();
  
  return {
    isTime: TTYPE_CATEGORIES.TIME.includes(tTypeUpper) || (tTypeUpper.startsWith('T') && tTypeUpper !== 'ADJ'),
    isDisbursement: TTYPE_CATEGORIES.DISBURSEMENT.includes(tTypeUpper) || (tTypeUpper.startsWith('D') && tTypeUpper !== 'ADJ'),
    isFee: TTYPE_CATEGORIES.FEE.includes(tTypeUpper) || tTypeUpper === 'F',
    isAdjustment: TTYPE_CATEGORIES.ADJUSTMENT.includes(tTypeUpper) || tTypeUpper === 'ADJ',
    isProvision: TTYPE_CATEGORIES.PROVISION.includes(tTypeUpper) || tTypeUpper === 'P',
  };
}

export interface WIPTransaction {
  Amount: number | null;
  TType: string;
  TranType: string;
  GSTaskID?: string; // Optional for task-level grouping
}

export interface WIPBalances {
  time: number;
  timeAdjustments: number;
  disbursements: number;
  disbursementAdjustments: number;
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
 * @param transactions - Array of WIP transaction records
 * @returns Aggregated WIP balances with detailed breakdown
 */
export function calculateWIPBalances(transactions: WIPTransaction[]): WIPBalances {
  let time = 0;
  let timeAdjustments = 0;
  let disbursements = 0;
  let disbursementAdjustments = 0;
  let fees = 0;
  let provision = 0;

  transactions.forEach((transaction) => {
    const amount = transaction.Amount || 0;
    const category = categorizeTransaction(transaction.TType, transaction.TranType);
    const tranTypeUpper = transaction.TranType?.toUpperCase() || '';

    if (category.isProvision) {
      // Provision tracked separately
      provision += amount;
    } else if (category.isFee) {
      // Fees are reversed (subtracted)
      fees += amount;
    } else if (category.isAdjustment) {
      // Adjustment transactions - differentiate by TranType
      if (tranTypeUpper.includes('TIME')) {
        timeAdjustments += amount;
      } else if (tranTypeUpper.includes('DISBURSEMENT') || tranTypeUpper.includes('DISB')) {
        disbursementAdjustments += amount;
      }
    } else if (category.isTime) {
      // Time transactions
      time += amount;
    } else if (category.isDisbursement) {
      // Disbursement transactions
      disbursements += amount;
    } else {
      // Other transactions default to time-like behavior
      time += amount;
    }
  });

  // Gross WIP = Time + Time Adjustments + Disbursements + Disbursement Adjustments - Fees
  const grossWip = time + timeAdjustments + disbursements + disbursementAdjustments - fees;
  
  // Net WIP = Gross WIP + Provision
  const netWip = grossWip + provision;

  return {
    time,
    timeAdjustments,
    disbursements,
    disbursementAdjustments,
    fees,
    provision,
    grossWip,
    netWip,
    balWIP: netWip, // Alias for backwards compatibility
    balTime: time + timeAdjustments - fees,
    balDisb: disbursements + disbursementAdjustments,
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























