import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ReportingPackPDF } from '../../../components/pdf/ReportingPackPDF';
import { AITaxReportData } from '@/lib/tools/tax-opinion/services/aiTaxReportGenerator';

export interface MappedAccount {
  accountCode: string;
  accountName: string;
  balance: number;
  priorYearBalance: number;
  sarsItem: string;
  section: string;
}

export interface TaxAdjustment {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  sarsSection?: string;
  notes?: string;
  confidenceScore?: number;
  createdAt?: string;
  status?: string;
}

export interface ReportData {
  taskName: string;
  trialBalance?: {
    accounts: MappedAccount[];
    totals: { currentYear: number; priorYear: number };
  };
  balanceSheet?: {
    mappedData: MappedAccount[];
    totals: Record<string, number>;
  };
  incomeStatement?: {
    mappedData: MappedAccount[];
    totals: Record<string, number>;
  };
  taxCalculation?: {
    accountingProfit: number;
    adjustments: TaxAdjustment[];
  };
  aiReport?: AITaxReportData | null;
}

export async function generateReportingPackPDF(
  reportData: ReportData,
  selectedReports: string[]
): Promise<Blob> {
  return await pdf(
    React.createElement(ReportingPackPDF, { data: reportData, selectedReports }) as any
  ).toBlob();
}

