export interface TaxAdjustment {
  id: number;
  taskId: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string | null;
  notes?: string | null;
  calculationDetails?: string | null;
  confidenceScore?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxCalculationData {
  netProfit: number;
  debitAdjustments: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  creditAdjustments: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  allowances: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  calculatedProfit: number;
}

export interface TaxExportData {
  taskName: string;
  accountingProfit: number;
  adjustments: Array<{
    id: number;
    type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
    description: string;
    amount: number;
    status: string;
    sarsSection?: string;
    notes?: string;
  }>;
  taxableIncome: number;
  taxLiability: number;
}







































