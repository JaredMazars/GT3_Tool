/**
 * Business rules and constants
 */

export const PROJECT_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_PROJECT: 100,
  MAX_ADJUSTMENTS_PER_PROJECT: 500,
  MAX_DOCUMENTS_PER_OPINION: 50,
} as const;

export const FILE_UPLOAD = {
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls'],
  MIME_TYPES: {
    PDF: 'application/pdf',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    DOC: 'application/msword',
    TXT: 'text/plain',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
  },
} as const;

export const CACHE_TTL = {
  PROJECT: 5 * 60, // 5 minutes
  CLIENT: 10 * 60, // 10 minutes
  USER: 15 * 60, // 15 minutes
  TAX_CALCULATION: 5 * 60, // 5 minutes
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
} as const;

export const ADJUSTMENT_STATUS = {
  SUGGESTED: 'SUGGESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
} as const;


























