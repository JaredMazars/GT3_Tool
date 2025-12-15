/**
 * Debtor Transaction Aggregation Utilities
 * 
 * Aggregates DrsTransactions data to calculate debtor balances, aging analysis,
 * and payment metrics for recoverability analytics
 */

export interface DebtorTransactionRecord {
  TranDate: Date;
  Total: number | null;
  EntryType: string | null;
  InvNumber: string | null;
  ServLineCode: string;
  updatedAt: Date;
}

export interface AgingBuckets {
  current: number;       // 0-60 days
  days61_90: number;     // 61-90 days
  days91_120: number;    // 91-120 days
  days120Plus: number;   // 120+ days
}

export interface DebtorMetrics {
  totalBalance: number;
  aging: AgingBuckets;
  avgPaymentDaysPaid: number | null;
  avgPaymentDaysOutstanding: number;
  transactionCount: number;
  invoiceCount: number;
}

/**
 * Calculate aging buckets for a transaction based on transaction date
 * Uses 60-day standard: 0-60 (current), 61-90, 91-120, 120+
 */
function calculateAgingForTransaction(tranDate: Date, amount: number): AgingBuckets {
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - tranDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const aging: AgingBuckets = {
    current: 0,
    days61_90: 0,
    days91_120: 0,
    days120Plus: 0,
  };

  if (daysDiff <= 60) {
    aging.current = amount;
  } else if (daysDiff <= 90) {
    aging.days61_90 = amount;
  } else if (daysDiff <= 120) {
    aging.days91_120 = amount;
  } else {
    aging.days120Plus = amount;
  }

  return aging;
}

/**
 * Add two aging bucket objects together
 */
function addAgingBuckets(a: AgingBuckets, b: AgingBuckets): AgingBuckets {
  return {
    current: a.current + b.current,
    days61_90: a.days61_90 + b.days61_90,
    days91_120: a.days91_120 + b.days91_120,
    days120Plus: a.days120Plus + b.days120Plus,
  };
}

/**
 * Calculate payment metrics from transactions
 * Returns average weighted payment days for paid and outstanding invoices
 */
function calculatePaymentMetrics(transactions: DebtorTransactionRecord[]): {
  avgPaymentDaysPaid: number | null;
  avgPaymentDaysOutstanding: number;
} {
  const today = new Date();
  
  // Group transactions by invoice number
  const invoiceMap = new Map<string, {
    invoiceDate: Date;
    invoiceAmount: number;
    paymentDate: Date | null;
  }>();

  // First pass: collect invoice and payment data
  transactions.forEach((transaction) => {
    const amount = transaction.Total || 0;
    const invNumber = transaction.InvNumber;
    
    if (!invNumber) return;

    const entryType = (transaction.EntryType || '').toLowerCase();
    
    if (entryType.includes('invoice') || entryType.includes('inv')) {
      // This is an invoice transaction
      if (!invoiceMap.has(invNumber)) {
        invoiceMap.set(invNumber, {
          invoiceDate: transaction.TranDate,
          invoiceAmount: amount,
          paymentDate: null,
        });
      }
    } else if (entryType.includes('payment') || entryType.includes('receipt')) {
      // This is a payment transaction
      const invoice = invoiceMap.get(invNumber);
      if (invoice && !invoice.paymentDate) {
        invoice.paymentDate = transaction.TranDate;
      }
    }
  });

  // Calculate weighted averages
  let paidTotalWeightedDays = 0;
  let paidTotalAmount = 0;
  let outstandingTotalWeightedDays = 0;
  let outstandingTotalAmount = 0;

  invoiceMap.forEach((invoice) => {
    const amount = Math.abs(invoice.invoiceAmount);
    
    if (invoice.paymentDate) {
      // Paid invoice - calculate days from invoice to payment
      const daysToPay = Math.floor(
        (invoice.paymentDate.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      paidTotalWeightedDays += daysToPay * amount;
      paidTotalAmount += amount;
    } else {
      // Outstanding invoice - calculate days from invoice to today
      const daysOutstanding = Math.floor(
        (today.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      outstandingTotalWeightedDays += daysOutstanding * amount;
      outstandingTotalAmount += amount;
    }
  });

  return {
    avgPaymentDaysPaid: paidTotalAmount > 0 ? paidTotalWeightedDays / paidTotalAmount : null,
    avgPaymentDaysOutstanding: outstandingTotalAmount > 0 ? outstandingTotalWeightedDays / outstandingTotalAmount : 0,
  };
}

/**
 * Aggregate debtor transactions by service line
 * 
 * @param transactions - Array of debtor transaction records
 * @param serviceLineMap - Map of ServLineCode to Master Service Line codes
 * @returns Map of Master Service Line code to aggregated debtor metrics
 */
export function aggregateDebtorsByServiceLine(
  transactions: DebtorTransactionRecord[],
  serviceLineMap: Map<string, string>
): Map<string, DebtorMetrics> {
  const groupedData = new Map<string, {
    transactions: DebtorTransactionRecord[];
    totalBalance: number;
    aging: AgingBuckets;
    invoiceCount: number;
  }>();

  // Group transactions by master service line
  transactions.forEach((transaction) => {
    const masterCode = serviceLineMap.get(transaction.ServLineCode) || 'UNKNOWN';
    
    if (!groupedData.has(masterCode)) {
      groupedData.set(masterCode, {
        transactions: [],
        totalBalance: 0,
        aging: { current: 0, days61_90: 0, days91_120: 0, days120Plus: 0 },
        invoiceCount: 0,
      });
    }

    const group = groupedData.get(masterCode)!;
    const amount = transaction.Total || 0;
    
    group.transactions.push(transaction);
    group.totalBalance += amount;
    
    // Calculate and add aging for this transaction
    const transactionAging = calculateAgingForTransaction(transaction.TranDate, amount);
    group.aging = addAgingBuckets(group.aging, transactionAging);
    
    // Count invoices
    const entryType = (transaction.EntryType || '').toLowerCase();
    if (entryType.includes('invoice') || entryType.includes('inv')) {
      group.invoiceCount++;
    }
  });

  // Calculate payment metrics for each service line
  const result = new Map<string, DebtorMetrics>();
  
  groupedData.forEach((data, masterCode) => {
    const paymentMetrics = calculatePaymentMetrics(data.transactions);
    
    result.set(masterCode, {
      totalBalance: data.totalBalance,
      aging: data.aging,
      avgPaymentDaysPaid: paymentMetrics.avgPaymentDaysPaid,
      avgPaymentDaysOutstanding: paymentMetrics.avgPaymentDaysOutstanding,
      transactionCount: data.transactions.length,
      invoiceCount: data.invoiceCount,
    });
  });

  return result;
}

/**
 * Aggregate overall debtor data from all transactions
 * 
 * @param transactions - Array of debtor transaction records
 * @returns Overall aggregated debtor metrics
 */
export function aggregateOverallDebtorData(
  transactions: DebtorTransactionRecord[]
): DebtorMetrics {
  let totalBalance = 0;
  let aging: AgingBuckets = {
    current: 0,
    days61_90: 0,
    days91_120: 0,
    days120Plus: 0,
  };
  let invoiceCount = 0;

  // Calculate totals and aging
  transactions.forEach((transaction) => {
    const amount = transaction.Total || 0;
    totalBalance += amount;
    
    // Calculate and add aging
    const transactionAging = calculateAgingForTransaction(transaction.TranDate, amount);
    aging = addAgingBuckets(aging, transactionAging);
    
    // Count invoices
    const entryType = (transaction.EntryType || '').toLowerCase();
    if (entryType.includes('invoice') || entryType.includes('inv')) {
      invoiceCount++;
    }
  });

  // Calculate payment metrics
  const paymentMetrics = calculatePaymentMetrics(transactions);

  return {
    totalBalance,
    aging,
    avgPaymentDaysPaid: paymentMetrics.avgPaymentDaysPaid,
    avgPaymentDaysOutstanding: paymentMetrics.avgPaymentDaysOutstanding,
    transactionCount: transactions.length,
    invoiceCount,
  };
}

