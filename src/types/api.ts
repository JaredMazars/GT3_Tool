/**
 * Re-export AI types from schemas for consistency
 */
export type {
  AITaxReport,
  TaxReportRisk,
  ExtractedData,
  TaxAdjustmentSuggestion,
  TaxAdjustmentSuggestions,
  CalculationDetails,
  MappedAccount,
  AccountMapping,
} from '@/lib/ai/schemas';

/**
 * Standard API response types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Tax computation export data types
 */
export interface TaxExportData {
  taskName: string;
  accountingProfit: number;
  adjustments: TaxAdjustmentExport[];
  taxableIncome: number;
  taxLiability: number;
}

export interface TaxAdjustmentExport {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  status: string;
  sarsSection?: string;
  notes?: string;
}

/**
 * Document extraction context
 */
export interface ExtractionContext {
  adjustmentType: string;
  adjustmentDescription: string;
  taskId: number;
}

/**
 * File upload types
 */
export interface FileUploadResult {
  success: boolean;
  fileId?: number;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}

/**
 * Health check types
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    openai?: ServiceStatus;
  };
  version?: string;
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

/**
 * Permission check types
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface PermissionCheckRequest {
  userId: string;
  taskId?: number;
  serviceLine?: string;
  feature?: string;
}

/**
 * My Reports - Profitability Report types
 */

/**
 * Profitability Report request parameters
 */
export interface ProfitabilityReportParams {
  fiscalYear?: number;        // If provided, show fiscal year view
  startDate?: string;         // For custom date range (ISO format)
  endDate?: string;           // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom'; // View mode
}

/**
 * Profitability Report response data
 */
export interface ProfitabilityReportData {
  tasks: TaskWithWIPAndServiceLine[];
  filterMode: 'PARTNER' | 'MANAGER';
  employeeCode: string;
  fiscalYear?: number;        // If fiscal year mode
  dateRange?: {               // If custom mode
    start: string;
    end: string;
  };
  isPeriodFiltered: boolean;  // True = period-specific, False = lifetime
}

export interface TaskWithWIP {
  id: number;
  TaskCode: string;
  TaskDesc: string;
  TaskPartner: string;
  TaskPartnerName: string;
  TaskManager: string;
  TaskManagerName: string;
  netWip: number;
  // Profitability metrics
  ltdHours: number;
  ltdTime: number;
  ltdDisb: number;
  ltdAdj: number;
  ltdCost: number;
  grossProduction: number;
  netRevenue: number;
  adjustmentPercentage: number;
  grossProfit: number;
  grossProfitPercentage: number;
}

export interface TaskWithWIPAndServiceLine extends TaskWithWIP {
  groupCode: string;
  groupDesc: string;
  clientCode: string;
  clientNameFull: string | null;
  GSClientID: string;
  servLineCode: string;
  subServlineGroupCode: string;
  subServlineGroupDesc: string;
  serviceLineName: string;
  masterServiceLineCode: string;
  masterServiceLineName: string;
}

/**
 * My Reports - Tasks by Group types
 */
export interface TasksByGroupReport {
  tasks: Array<{
    id: number;
    TaskCode: string;
    TaskDesc: string;
    TaskPartner: string;
    TaskPartnerName: string;
    TaskManager: string;
    TaskManagerName: string;
    netWip: number;
    groupCode: string;
    groupDesc: string;
    clientCode: string;
    clientNameFull: string | null;
    GSClientID: string;
    servLineCode: string;
    subServlineGroupCode: string;
    subServlineGroupDesc: string;
    serviceLineName: string;
    masterServiceLineCode: string;
    masterServiceLineName: string;
  }>;
  filterMode: 'PARTNER' | 'MANAGER';
  employeeCode: string;
}

/**
 * My Reports - Overview types
 */
export interface MonthlyMetrics {
  month: string; // YYYY-MM format
  netRevenue: number;
  grossProfit: number;
  collections: number;
  wipLockupDays: number;
  debtorsLockupDays: number;
  writeoffPercentage: number;
  // Calculation components for tooltips
  wipBalance?: number;
  trailing12Revenue?: number;
  debtorsBalance?: number;
  trailing12Billings?: number;
  negativeAdj?: number;
  provisions?: number;
  grossTime?: number;
}

/**
 * My Reports Overview request parameters
 */
export interface MyReportsOverviewParams {
  fiscalYear?: number;        // If provided, show fiscal year view
  startDate?: string;         // For custom date range (ISO format)
  endDate?: string;           // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom'; // View mode
  serviceLines?: string[];    // Optional array of masterCode values to filter by service line
}

/**
 * My Reports Overview response data
 */
export interface MyReportsOverviewData {
  monthlyMetrics?: MonthlyMetrics[]; // Cumulative within period (single year)
  yearlyData?: { [year: string]: MonthlyMetrics[] }; // Multi-year comparison data
  filterMode: 'PARTNER' | 'MANAGER';
  employeeCode: string;
  fiscalYear?: number | 'all'; // If fiscal year mode, 'all' for multi-year comparison
  dateRange?: {               // If custom mode
    start: string;
    end: string;
  };
  isCumulative: boolean;      // Always true now
}

/**
 * My Reports - Recoverability Report types
 */

/**
 * Aging buckets for debtor analysis
 */
export interface AgingBuckets {
  current: number;       // 0-30 days
  days31_60: number;     // 31-60 days
  days61_90: number;     // 61-90 days
  days91_120: number;    // 91-120 days
  days120Plus: number;   // 120+ days
}

/**
 * Recoverability Report request parameters
 */
export interface RecoverabilityReportParams {
  fiscalYear?: number;        // If provided, show fiscal year view
  startDate?: string;         // For custom date range (ISO format)
  endDate?: string;           // For custom date range (ISO format)
  mode?: 'fiscal' | 'custom'; // View mode
}

/**
 * Recoverability Report response data
 */
export interface RecoverabilityReportData {
  clients: ClientDebtorData[];
  totalAging: AgingBuckets;
  receiptsComparison: {
    currentPeriodReceipts: number;
    priorMonthBalance: number;
    variance: number;
  };
  employeeCode: string;
  fiscalYear?: number;        // If fiscal year mode
  dateRange?: {               // If custom mode
    start: string;
    end: string;
  };
}

/**
 * Monthly receipt data for a single month
 */
export interface MonthlyReceiptData {
  month: string;           // 'Sep', 'Oct', etc.
  monthYear: string;       // '2024-09' for sorting
  openingBalance: number;  // Balance at start of month
  receipts: number;        // Payments received in month
  variance: number;        // Receipts - Opening Balance (surplus/deficit)
  recoveryPercent: number; // receipts / openingBalance * 100
  billings: number;        // Positive transactions in month
  closingBalance: number;  // Opening + Billings - Receipts
}

/**
 * Client-level debtor data with aging and receipts
 */
export interface ClientDebtorData {
  GSClientID: string;
  clientCode: string;
  clientNameFull: string | null;
  groupCode: string;
  groupDesc: string;
  servLineCode: string;
  serviceLineName: string;
  masterServiceLineCode: string;
  masterServiceLineName: string;
  subServlineGroupCode: string;
  subServlineGroupDesc: string;
  totalBalance: number;
  aging: AgingBuckets;
  currentPeriodReceipts: number;
  priorMonthBalance: number;
  invoiceCount: number;
  avgPaymentDaysOutstanding: number;
  monthlyReceipts: MonthlyReceiptData[];  // Monthly breakdown for receipts view
}


































