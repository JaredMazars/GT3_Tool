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
  Reference: string | null;
  Narration: string | null;
  ServLineCode: string;
  updatedAt: Date;
}

export interface AgingBuckets {
  current: number;       // 0-30 days
  days31_60: number;     // 31-60 days
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

export interface PaymentTransaction {
  date: Date;
  amount: number;
  reference: string | null;
  entryType: string | null;
  narration: string | null;
}

export interface InvoiceDetail {
  invoiceNumber: string;
  invoiceDate: Date;
  originalAmount: number;
  paymentsReceived: number;
  netBalance: number;
  daysOutstanding: number;
  servLineCode: string;
  servLineName?: string;
  agingBucket: 'current' | 'days31_60' | 'days61_90' | 'days91_120' | 'days120Plus';
  paymentHistory: PaymentTransaction[];
}

export interface InvoicesByBucket {
  current: InvoiceDetail[];
  days31_60: InvoiceDetail[];
  days61_90: InvoiceDetail[];
  days91_120: InvoiceDetail[];
  days120Plus: InvoiceDetail[];
}

interface InvoiceBalance {
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceAmount: number;
  paymentsTotal: number;
  netBalance: number;
  servLineCode: string;
}

/**
 * Match payments and receipts to invoices to calculate net balances
 * Uses Reference and InvNumber fields for matching
 * 
 * Simplified logic: Sum all transactions by invoice number
 * - Positive amounts = invoices/debits (increase balance)
 * - Negative amounts = payments/credits (decrease balance)
 */
function matchPaymentsToInvoices(transactions: DebtorTransactionRecord[]): Map<string, InvoiceBalance> {
  const invoiceData = new Map<string, {
    invoiceDate: Date | null;
    totalAmount: number;
    originalInvoiceAmount: number;
    servLineCode: string;
  }>();
  
  // Process all transactions and sum by InvNumber only
  // Note: Reference is NOT used because receipts have their own reference numbers
  // that don't match invoice numbers. Only InvNumber links invoices and receipts.
  transactions.forEach((transaction) => {
    const amount = transaction.Total || 0;
    const invNumber = transaction.InvNumber;
    
    // Skip transactions without InvNumber
    if (!invNumber) {
      return;
    }
    
    if (!invoiceData.has(invNumber)) {
      // For positive amounts (invoices), use the transaction date as invoice date
      // For negative amounts (payments), we'll update the invoice date if we see the invoice later
      invoiceData.set(invNumber, {
        invoiceDate: amount > 0 ? transaction.TranDate : null,
        totalAmount: amount,
        originalInvoiceAmount: amount > 0 ? amount : 0,
        servLineCode: transaction.ServLineCode,
      });
    } else {
      const data = invoiceData.get(invNumber)!;
      data.totalAmount += amount;
      
      // Track original invoice amount (sum of positive transactions only)
      if (amount > 0) {
        data.originalInvoiceAmount += amount;
        
        // Update invoice date if this is an earlier positive transaction
        if (!data.invoiceDate || transaction.TranDate < data.invoiceDate) {
          data.invoiceDate = transaction.TranDate;
        }
      }
    }
  });
  
  // Convert to InvoiceBalance format
  const invoices = new Map<string, InvoiceBalance>();
  const today = new Date();
  
  // Find invoices that have matching write-offs under different invoice numbers
  // If we have an invoice with amount X and another with amount -X, both should be excluded
  const amountMap = new Map<number, string[]>();
  invoiceData.forEach((data, invNumber) => {
    const amount = data.totalAmount;
    if (!amountMap.has(amount)) {
      amountMap.set(amount, []);
    }
    amountMap.get(amount)!.push(invNumber);
  });
  
  const excludedInvoices = new Set<string>();
  amountMap.forEach((invoiceNumbers, amount) => {
    // Check if there's a matching negative amount
    const negativeAmount = -amount;
    if (amount !== 0 && amountMap.has(negativeAmount)) {
      // Both the positive and negative amounts should be excluded
      invoiceNumbers.forEach(inv => excludedInvoices.add(inv));
      amountMap.get(negativeAmount)!.forEach(inv => excludedInvoices.add(inv));
    }
  });
  
  invoiceData.forEach((data, invNumber) => {
    // Use invoice date if available, otherwise use today (for safety)
    const invoiceDate = data.invoiceDate || today;
    
    // Skip if:
    // 1. Excluded due to matching write-off with different invoice number
    // 2. Negative balance (standalone write-offs/credits)
    // Include zero-balance invoices (fully paid) for payment metrics calculation
    if (data.totalAmount >= 0 && !excludedInvoices.has(invNumber)) {
      invoices.set(invNumber, {
        invoiceNumber: invNumber,
        invoiceDate: invoiceDate,
        invoiceAmount: data.originalInvoiceAmount, // Use original invoice amount (sum of positive transactions)
        paymentsTotal: data.originalInvoiceAmount - data.totalAmount, // Calculate payments from difference
        netBalance: data.totalAmount,
        servLineCode: data.servLineCode,
      });
    }
  });
  
  return invoices;
}

/**
 * Calculate aging buckets from invoice balances
 * Ages all invoices with positive net balance based on invoice date
 * Uses 30-day intervals: 0-30 (current), 31-60, 61-90, 91-120, 120+
 */
function calculateAgingBucketsFromInvoices(invoices: Map<string, InvoiceBalance>): AgingBuckets {
  const aging: AgingBuckets = {
    current: 0,
    days31_60: 0,
    days61_90: 0,
    days91_120: 0,
    days120Plus: 0,
  };
  
  const today = new Date();
  
  invoices.forEach((invoice) => {
    const balance = invoice.netBalance;
    
    // Only age invoices with outstanding positive balance
    if (balance > 0) {
      const daysDiff = Math.floor((today.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Handle negative days (future dates) by treating as current
      // This handles data entry errors (e.g., 2025 instead of 2024)
      if (daysDiff < 0 || daysDiff <= 30) {
        aging.current += balance;
      } else if (daysDiff <= 60) {
        aging.days31_60 += balance;
      } else if (daysDiff <= 90) {
        aging.days61_90 += balance;
      } else if (daysDiff <= 120) {
        aging.days91_120 += balance;
      } else {
        aging.days120Plus += balance;
      }
    }
  });
  
  return aging;
}


/**
 * Calculate payment metrics from transactions using the matched invoices
 * Returns average weighted payment days for paid and outstanding invoices
 * 
 * @param transactions - All transactions for grouping by invoice
 * @param invoices - Map of matched invoices with net balances (from matchPaymentsToInvoices)
 */
function calculatePaymentMetrics(
  transactions: DebtorTransactionRecord[],
  invoices: Map<string, InvoiceBalance>
): {
  avgPaymentDaysPaid: number | null;
  avgPaymentDaysOutstanding: number;
} {
  const today = new Date();
  
  // Group all transactions by InvNumber with chronological ordering
  const transactionsByInvoice = new Map<string, DebtorTransactionRecord[]>();
  transactions.forEach((txn) => {
    if (txn.InvNumber) {
      if (!transactionsByInvoice.has(txn.InvNumber)) {
        transactionsByInvoice.set(txn.InvNumber, []);
      }
      transactionsByInvoice.get(txn.InvNumber)!.push(txn);
    }
  });

  // Sort transactions by date for each invoice
  transactionsByInvoice.forEach((txns) => {
    txns.sort((a, b) => a.TranDate.getTime() - b.TranDate.getTime());
  });

  // Calculate weighted averages
  let paidTotalWeightedDays = 0;
  let paidTotalAmount = 0;
  let outstandingTotalWeightedDays = 0;
  let outstandingTotalAmount = 0;

  invoices.forEach((invoice) => {
    const txns = transactionsByInvoice.get(invoice.invoiceNumber);
    if (!txns || txns.length === 0) {
      return;
    }

    // Find first positive transaction (invoice date) and last transaction (payment/final date)
    const firstPositiveTxn = txns.find((t) => (t.Total || 0) > 0);
    const lastTxn = txns[txns.length - 1];
    
    if (!firstPositiveTxn || !lastTxn) {
      return;
    }
    
    const invoiceDate = firstPositiveTxn.TranDate;
    const amount = Math.abs(invoice.invoiceAmount);

    if (invoice.netBalance === 0) {
      // Paid invoice - calculate days from first positive transaction to last transaction
      const daysToPay = Math.floor(
        (lastTxn.TranDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      paidTotalWeightedDays += daysToPay * amount;
      paidTotalAmount += amount;
    } else if (invoice.netBalance > 0) {
      // Outstanding invoice - calculate days from first positive transaction to today
      const daysOutstanding = Math.floor(
        (today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      outstandingTotalWeightedDays += daysOutstanding * invoice.netBalance;
      outstandingTotalAmount += invoice.netBalance;
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
  // First, match all payments to invoices to get net balances
  const allInvoices = matchPaymentsToInvoices(transactions);
  
  // Group invoices by master service line
  const groupedInvoices = new Map<string, InvoiceBalance[]>();
  const groupedTransactions = new Map<string, DebtorTransactionRecord[]>();
  
  allInvoices.forEach((invoice) => {
    const masterCode = serviceLineMap.get(invoice.servLineCode) || 'UNKNOWN';
    
    if (!groupedInvoices.has(masterCode)) {
      groupedInvoices.set(masterCode, []);
    }
    groupedInvoices.get(masterCode)!.push(invoice);
  });
  
  // Also group transactions for payment metrics calculation
  transactions.forEach((transaction) => {
    const masterCode = serviceLineMap.get(transaction.ServLineCode) || 'UNKNOWN';
    
    if (!groupedTransactions.has(masterCode)) {
      groupedTransactions.set(masterCode, []);
    }
    groupedTransactions.get(masterCode)!.push(transaction);
  });

  // Calculate metrics for each service line
  const result = new Map<string, DebtorMetrics>();
  
  groupedInvoices.forEach((invoices, masterCode) => {
    const invoicesMap = new Map<string, InvoiceBalance>();
    invoices.forEach(inv => invoicesMap.set(inv.invoiceNumber, inv));
    
    // Calculate aging from net invoice balances
    const aging = calculateAgingBucketsFromInvoices(invoicesMap);
    
    // Calculate total balance from net invoice balances
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.netBalance, 0);
    
    // Get payment metrics
    const serviceLineTransactions = groupedTransactions.get(masterCode) || [];
    const paymentMetrics = calculatePaymentMetrics(serviceLineTransactions, invoicesMap);
    
    result.set(masterCode, {
      totalBalance,
      aging,
      avgPaymentDaysPaid: paymentMetrics.avgPaymentDaysPaid,
      avgPaymentDaysOutstanding: paymentMetrics.avgPaymentDaysOutstanding,
      transactionCount: serviceLineTransactions.length,
      invoiceCount: invoices.length,
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
  // Match payments to invoices to get net balances
  const invoices = matchPaymentsToInvoices(transactions);
  
  // Calculate aging from net invoice balances
  const aging = calculateAgingBucketsFromInvoices(invoices);
  
  // Calculate total balance from net invoice balances (only unpaid/partially paid)
  let totalBalance = 0;
  invoices.forEach((invoice) => {
    totalBalance += invoice.netBalance;
  });
  
  // Calculate payment metrics
  const paymentMetrics = calculatePaymentMetrics(transactions, invoices);

  return {
    totalBalance,
    aging,
    avgPaymentDaysPaid: paymentMetrics.avgPaymentDaysPaid,
    avgPaymentDaysOutstanding: paymentMetrics.avgPaymentDaysOutstanding,
    transactionCount: transactions.length,
    invoiceCount: invoices.size,
  };
}

/**
 * Get detailed invoice information grouped by aging bucket
 * 
 * @param transactions - Array of debtor transaction records
 * @param serviceLineMap - Optional map of ServLineCode to Master Service Line names
 * @returns Invoices grouped by aging bucket with detailed payment history
 */
export function getInvoiceDetailsByBucket(
  transactions: DebtorTransactionRecord[],
  serviceLineMap?: Map<string, string>
): InvoicesByBucket {
  // Match payments to invoices to get net balances
  const invoices = matchPaymentsToInvoices(transactions);
  
  // Group transactions by invoice number for payment history
  const transactionsByInvoice = new Map<string, DebtorTransactionRecord[]>();
  transactions.forEach((txn) => {
    if (txn.InvNumber) {
      if (!transactionsByInvoice.has(txn.InvNumber)) {
        transactionsByInvoice.set(txn.InvNumber, []);
      }
      transactionsByInvoice.get(txn.InvNumber)!.push(txn);
    }
  });
  
  // Sort transactions by date for each invoice
  transactionsByInvoice.forEach((txns) => {
    txns.sort((a, b) => a.TranDate.getTime() - b.TranDate.getTime());
  });
  
  const today = new Date();
  const result: InvoicesByBucket = {
    current: [],
    days31_60: [],
    days61_90: [],
    days91_120: [],
    days120Plus: [],
  };
  
  // Process each invoice
  invoices.forEach((invoice) => {
    // Only include invoices with outstanding balance
    if (invoice.netBalance <= 0) {
      return;
    }
    
    // Calculate days outstanding
    const daysDiff = Math.floor((today.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysOutstanding = Math.max(0, daysDiff); // Never negative
    
    // Determine aging bucket
    let agingBucket: InvoiceDetail['agingBucket'];
    if (daysDiff < 0 || daysDiff <= 30) {
      agingBucket = 'current';
    } else if (daysDiff <= 60) {
      agingBucket = 'days31_60';
    } else if (daysDiff <= 90) {
      agingBucket = 'days61_90';
    } else if (daysDiff <= 120) {
      agingBucket = 'days91_120';
    } else {
      agingBucket = 'days120Plus';
    }
    
    // Build payment history
    const txns = transactionsByInvoice.get(invoice.invoiceNumber) || [];
    const paymentHistory: PaymentTransaction[] = txns.map((txn) => ({
      date: txn.TranDate,
      amount: txn.Total || 0,
      reference: txn.Reference,
      entryType: txn.EntryType,
      narration: txn.Narration,
    }));
    
    // Create invoice detail
    const invoiceDetail: InvoiceDetail = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      originalAmount: invoice.invoiceAmount,
      paymentsReceived: invoice.paymentsTotal,
      netBalance: invoice.netBalance,
      daysOutstanding,
      servLineCode: invoice.servLineCode,
      servLineName: serviceLineMap?.get(invoice.servLineCode),
      agingBucket,
      paymentHistory,
    };
    
    // Add to appropriate bucket
    result[agingBucket].push(invoiceDetail);
  });
  
  // Sort each bucket by invoice date (newest first)
  Object.values(result).forEach((bucket) => {
    bucket.sort((a: InvoiceDetail, b: InvoiceDetail) => b.invoiceDate.getTime() - a.invoiceDate.getTime());
  });
  
  return result;
}

