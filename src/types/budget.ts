/**
 * Budget-related type definitions for task budgeting
 */

export interface BudgetCategory {
  empCatCode: string;
  empCatDesc: string;
  totalHours: number;
  averageRate: number;
  totalAmount: number;
  members: BudgetMember[];
}

export interface BudgetMember {
  teamMemberId: number;
  userId: string;
  userName: string;
  allocatedHours: number;
  rate: number;
  amount: number;
}

export interface BudgetDisbursement {
  id: number;
  description: string;
  amount: number;
  expectedDate: string;
  createdBy: string;
  createdAt: string;
}

export interface BudgetFee {
  id: number;
  description: string;
  amount: number;
  expectedDate: string;
  createdBy: string;
  createdAt: string;
}

export interface TaskBudgetData {
  categories: BudgetCategory[];
  disbursements: BudgetDisbursement[];
  fees: BudgetFee[];
  summary: BudgetSummary;
}

export interface BudgetSummary {
  totalStaffHours: number;
  totalStaffAmount: number;
  totalDisbursements: number;
  totalFees: number;
  adjustment: number;
  adjustmentPercentage: number;
  grandTotal: number;
}
