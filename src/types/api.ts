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
export interface ProfitabilityReportData {
  tasks: TaskWithWIPAndServiceLine[];
  filterMode: 'PARTNER' | 'MANAGER';
  employeeCode: string;
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


































