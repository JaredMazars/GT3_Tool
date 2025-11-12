/**
 * Branded types for type-safe IDs
 * Prevents accidentally mixing different ID types
 */

export type ProjectId = number & { readonly __brand: 'ProjectId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type DraftId = number & { readonly __brand: 'DraftId' };
export type ClientId = number & { readonly __brand: 'ClientId' };
export type AdjustmentId = number & { readonly __brand: 'AdjustmentId' };
export type DocumentId = number & { readonly __brand: 'DocumentId' };

/**
 * Convert unknown value to ProjectId with validation
 */
export const toProjectId = (value: unknown): ProjectId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ProjectId: ${value}`);
  }
  return id as ProjectId;
};

/**
 * Convert unknown value to UserId with validation
 */
export const toUserId = (value: unknown): UserId => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid UserId: ${value}`);
  }
  return value as UserId;
};

/**
 * Convert unknown value to DraftId with validation
 */
export const toDraftId = (value: unknown): DraftId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid DraftId: ${value}`);
  }
  return id as DraftId;
};

/**
 * Convert unknown value to ClientId with validation
 */
export const toClientId = (value: unknown): ClientId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ClientId: ${value}`);
  }
  return id as ClientId;
};

/**
 * Convert unknown value to AdjustmentId with validation
 */
export const toAdjustmentId = (value: unknown): AdjustmentId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid AdjustmentId: ${value}`);
  }
  return id as AdjustmentId;
};

/**
 * Convert unknown value to DocumentId with validation
 */
export const toDocumentId = (value: unknown): DocumentId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid DocumentId: ${value}`);
  }
  return id as DocumentId;
};


