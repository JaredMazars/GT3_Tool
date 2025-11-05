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
 * Document extraction types
 */
export interface ExtractionContext {
  adjustmentType: string;
  adjustmentDescription: string;
  projectId: number;
}

export interface ExtractedData {
  type: string;
  confidence: number;
  data: Record<string, any>;
  warnings?: string[];
  extractedAt: string;
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
 * Tax adjustment suggestion types
 */
export interface TaxAdjustmentSuggestion {
  type: 'DEBIT' | 'CREDIT' | 'ALLOWANCE' | 'RECOUPMENT';
  description: string;
  amount: number;
  sarsSection: string;
  confidenceScore: number;
  reasoning: string;
  calculationDetails: CalculationDetails;
}

export interface CalculationDetails {
  method: string;
  inputs: Record<string, any>;
  formula?: string;
}

/**
 * AI Report types
 */
export interface AITaxReportData {
  executiveSummary: string;
  risks: RiskItem[];
  taxSensitiveItems: TaxSensitiveItem[];
  detailedFindings: string;
  recommendations: string[];
}

export interface RiskItem {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact?: string;
  mitigation?: string;
}

export interface TaxSensitiveItem {
  item: string;
  amount: number;
  concern: string;
  sarsSection?: string;
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





























