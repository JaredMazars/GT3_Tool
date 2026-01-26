/**
 * WIP Transaction Aggregation Utilities
 * 
 * Aggregates WIPTransactions data using exact TType matching
 * for profitability calculations
 */

import { categorizeTransaction } from '@/lib/services/clients/clientBalanceCalculation';

export interface WipTransactionRecord {
  TaskServLine: string;
  Amount: number | null;
  Cost: number;
  Hour: number;
  TType: string;
  updatedAt: Date;
}

export interface AggregatedWipData {
  ltdTime: number;
  ltdAdj: number; // Merged adjustments
  ltdCost: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdDisb: number;
  ltdFee: number; // Merged fees
  ltdHours: number;
  taskCount: number;
}

/**
 * Aggregate WIP transactions by service line
 * 
 * @param transactions - Array of WIP transaction records
 * @param serviceLineMap - Map of TaskServLine codes to Master Service Line codes
 * @returns Map of Master Service Line code to aggregated data
 */
export function aggregateWipTransactionsByServiceLine(
  transactions: WipTransactionRecord[],
  serviceLineMap: Map<string, string>
): Map<string, AggregatedWipData> {
  const groupedData = new Map<string, AggregatedWipData>();

  transactions.forEach((transaction) => {
    const masterCode = serviceLineMap.get(transaction.TaskServLine) || 'UNKNOWN';
    
    if (!groupedData.has(masterCode)) {
      groupedData.set(masterCode, {
        ltdTime: 0,
        ltdAdj: 0,
        ltdCost: 0,
        balWIP: 0,
        balTime: 0,
        balDisb: 0,
        wipProvision: 0,
        ltdDisb: 0,
        ltdFee: 0,
        ltdHours: 0,
        taskCount: 0,
      });
    }

    const group = groupedData.get(masterCode)!;
    const amount = transaction.Amount || 0;
    const cost = transaction.Cost || 0;
    const hours = transaction.Hour || 0;
    
    const category = categorizeTransaction(transaction.TType);

    // Accumulate cost (all transactions except provisions)
    if (!category.isProvision) {
      group.ltdCost += cost;
    }

    // Process based on transaction type using simplified formula
    // balWIP = Net WIP = Time + Adj + Disb - Fees + Provision
    if (category.isProvision) {
      group.wipProvision += amount;
      group.balWIP += amount; // Add provision to balWIP for Net WIP
    } else if (category.isFee) {
      group.ltdFee += amount;
      group.balWIP -= amount;
    } else if (category.isAdjustment) {
      group.ltdAdj += amount;
      group.balWIP += amount;
    } else if (category.isTime) {
      group.ltdTime += amount;
      group.balTime += amount;
      group.balWIP += amount;
      group.ltdHours += hours;
    } else if (category.isDisbursement) {
      group.ltdDisb += amount;
      group.balDisb += amount;
      group.balWIP += amount;
    }
  });

  return groupedData;
}

/**
 * Aggregate overall WIP data from all transactions
 * 
 * Uses exact TType matching with simplified formula
 * 
 * @param transactions - Array of WIP transaction records
 * @returns Overall aggregated data
 */
export function aggregateOverallWipData(
  transactions: WipTransactionRecord[]
): AggregatedWipData {
  const overall: AggregatedWipData = {
    ltdTime: 0,
    ltdAdj: 0,
    ltdCost: 0,
    balWIP: 0,
    balTime: 0,
    balDisb: 0,
    wipProvision: 0,
    ltdDisb: 0,
    ltdFee: 0,
    ltdHours: 0,
    taskCount: 0,
  };

  transactions.forEach((transaction) => {
    const amount = transaction.Amount || 0;
    const cost = transaction.Cost || 0;
    const hours = transaction.Hour || 0;
    
    const category = categorizeTransaction(transaction.TType);

    // Accumulate cost (all transactions except provisions)
    if (!category.isProvision) {
      overall.ltdCost += cost;
    }

    // Process based on transaction type using simplified formula
    // balWIP = Net WIP = Time + Adj + Disb - Fees + Provision
    if (category.isProvision) {
      overall.wipProvision += amount;
      overall.balWIP += amount; // Add provision to balWIP for Net WIP
    } else if (category.isFee) {
      overall.ltdFee += amount;
      overall.balWIP -= amount;
    } else if (category.isAdjustment) {
      overall.ltdAdj += amount;
      overall.balWIP += amount;
    } else if (category.isTime) {
      overall.ltdTime += amount;
      overall.balTime += amount;
      overall.balWIP += amount;
      overall.ltdHours += hours;
    } else if (category.isDisbursement) {
      overall.ltdDisb += amount;
      overall.balDisb += amount;
      overall.balWIP += amount;
    }
  });

  return overall;
}

/**
 * Count unique tasks from transaction records
 * 
 * @param transactions - Array of WIP transaction records with GSTaskID
 * @returns Number of unique tasks
 */
export function countUniqueTasks(transactions: Array<{ GSTaskID: string }>): number {
  const uniqueTasks = new Set(transactions.map(t => t.GSTaskID));
  return uniqueTasks.size;
}

