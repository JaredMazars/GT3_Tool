// Analytics Types

export enum AnalyticsDocumentType {
  AFS = 'AFS',
  MANAGEMENT_ACCOUNTS = 'MANAGEMENT_ACCOUNTS',
  BANK_STATEMENTS = 'BANK_STATEMENTS',
  CASH_FLOW = 'CASH_FLOW',
  OTHER = 'OTHER',
}

export enum CreditRatingGrade {
  AAA = 'AAA',
  AA = 'AA',
  A = 'A',
  BBB = 'BBB',
  BB = 'BB',
  B = 'B',
  CCC = 'CCC',
  D = 'D',
}

export interface AnalyticsDocument {
  id: number;
  clientId: number;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  extractedData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialRatios {
  // Liquidity Ratios
  currentRatio?: number;
  quickRatio?: number;
  cashRatio?: number;
  
  // Profitability Ratios
  grossMargin?: number;
  netMargin?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  
  // Leverage Ratios
  debtToEquity?: number;
  interestCoverage?: number;
  debtRatio?: number;
  
  // Efficiency Ratios
  assetTurnover?: number;
  inventoryTurnover?: number;
  receivablesTurnover?: number;
}

export interface CreditAnalysisReport {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  riskFactors: Array<{
    factor: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
    mitigation?: string;
  }>;
  industryComparison?: {
    industry: string;
    companyPosition: string;
    keyMetrics: Array<{
      metric: string;
      companyValue: number;
      industryAverage: number;
      comparison: string;
    }>;
  };
  recommendations: string[];
  detailedAnalysis: string;
}

export interface CreditRating {
  id: number;
  clientId: number;
  ratingScore: number; // 0-100
  ratingGrade: CreditRatingGrade;
  ratingDate: Date;
  analysisReport: CreditAnalysisReport;
  financialRatios: FinancialRatios;
  confidence: number; // 0-1
  analyzedBy: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: AnalyticsDocument[];
}

export interface CreditRatingWithDocuments extends CreditRating {
  documents: AnalyticsDocument[];
}

export interface GenerateCreditRatingRequest {
  documentIds: number[];
}

export interface GenerateCreditRatingResponse {
  success: boolean;
  data?: CreditRating;
  error?: string;
}

export interface AnalyticsDocumentsResponse {
  success: boolean;
  data?: {
    documents: AnalyticsDocument[];
    totalCount: number;
  };
  error?: string;
}

export interface CreditRatingsResponse {
  success: boolean;
  data?: {
    ratings: CreditRating[];
    totalCount: number;
  };
  error?: string;
}

export interface LatestCreditRatingResponse {
  success: boolean;
  data?: CreditRating;
  error?: string;
}

export interface FinancialRatiosResponse {
  success: boolean;
  data?: FinancialRatios;
  error?: string;
}

// Utility types for document upload
export interface UploadDocumentData {
  file: File;
  documentType: AnalyticsDocumentType;
}

// For trend analysis
export interface RatingTrend {
  date: Date;
  ratingGrade: CreditRatingGrade;
  ratingScore: number;
  change?: number; // vs previous rating
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

// For ratio comparison
export interface RatioComparison {
  current: number;
  previous?: number;
  industryAverage?: number;
  benchmark?: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

