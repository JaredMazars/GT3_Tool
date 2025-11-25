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
 * Generic API response wrapper (for backward compatibility)
 * @deprecated Use ApiResponse instead
 */
export type GenericApiResponse<T = unknown> = ApiResponse<T>;

/**
 * Tax computation export data types
 */
export interface TaxExportData {
  projectName: string;
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
  projectId: number;
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
 * Legacy AI Report type - use AITaxReport from schemas instead
 * @deprecated Use AITaxReport from @/lib/ai/schemas
 */
export interface AITaxReportData {
  executiveSummary: string;
  risks: RiskItem[];
  taxSensitiveItems: TaxSensitiveItem[];
  detailedFindings: string;
  recommendations: string[];
  generatedAt?: string;
}

/**
 * @deprecated Use TaxReportRisk from @/lib/ai/schemas
 */
export interface RiskItem {
  category?: string;
  title?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact?: string;
  mitigation?: string;
  recommendation?: string;
}

/**
 * @deprecated Use TaxSensitiveItem from @/lib/ai/schemas
 */
export interface TaxSensitiveItem {
  item: string;
  reason: string;
  action: string;
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
  projectId?: number;
  serviceLine?: string;
  feature?: string;
}





































