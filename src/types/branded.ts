/**
 * Branded types for type-safe IDs
 * Prevents accidentally mixing different ID types
 */

export type TaskId = number & { readonly __brand: 'TaskId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type DraftId = number & { readonly __brand: 'DraftId' };
export type ClientId = number & { readonly __brand: 'ClientId' };
export type GSClientID = string & { readonly __brand: 'GSClientID' };
export type GSTaskID = string & { readonly __brand: 'GSTaskID' };
export type EmployeeId = number & { readonly __brand: 'EmployeeId' };
export type GSEmployeeID = string & { readonly __brand: 'GSEmployeeID' };
export type AdjustmentId = number & { readonly __brand: 'AdjustmentId' };
export type DocumentId = number & { readonly __brand: 'DocumentId' };
export type TemplateId = number & { readonly __brand: 'TemplateId' };
export type SectionId = number & { readonly __brand: 'SectionId' };
export type NotificationId = number & { readonly __brand: 'NotificationId' };
export type PermissionId = number & { readonly __brand: 'PermissionId' };
export type ServiceLineUserId = number & { readonly __brand: 'ServiceLineUserId' };
export type TaskTeamId = number & { readonly __brand: 'TaskTeamId' };
export type OpportunityId = number & { readonly __brand: 'OpportunityId' };
export type ActivityId = number & { readonly __brand: 'ActivityId' };
export type ContactId = number & { readonly __brand: 'ContactId' };

/**
 * Convert unknown value to TaskId with validation
 */
export const toTaskId = (value: unknown): TaskId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid TaskId: ${value}`);
  }
  return id as TaskId;
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
 * Convert unknown value to GSClientID with validation
 */
export const toGSClientID = (value: unknown): GSClientID => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid GSClientID: ${value}`);
  }
  return value as GSClientID;
};

/**
 * Convert unknown value to GSTaskID with validation
 */
export const toGSTaskID = (value: unknown): GSTaskID => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid GSTaskID: ${value}`);
  }
  return value as GSTaskID;
};

/**
 * Convert unknown value to EmployeeId with validation
 */
export const toEmployeeId = (value: unknown): EmployeeId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid EmployeeId: ${value}`);
  }
  return id as EmployeeId;
};

/**
 * Convert unknown value to GSEmployeeID with validation
 */
export const toGSEmployeeID = (value: unknown): GSEmployeeID => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid GSEmployeeID: ${value}`);
  }
  return value as GSEmployeeID;
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

/**
 * Convert unknown value to TemplateId with validation
 */
export const toTemplateId = (value: unknown): TemplateId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid TemplateId: ${value}`);
  }
  return id as TemplateId;
};

/**
 * Convert unknown value to SectionId with validation
 */
export const toSectionId = (value: unknown): SectionId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid SectionId: ${value}`);
  }
  return id as SectionId;
};

/**
 * Convert unknown value to NotificationId with validation
 */
export const toNotificationId = (value: unknown): NotificationId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid NotificationId: ${value}`);
  }
  return id as NotificationId;
};

/**
 * Convert unknown value to PermissionId with validation
 */
export const toPermissionId = (value: unknown): PermissionId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid PermissionId: ${value}`);
  }
  return id as PermissionId;
};

/**
 * Convert unknown value to ServiceLineUserId with validation
 */
export const toServiceLineUserId = (value: unknown): ServiceLineUserId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ServiceLineUserId: ${value}`);
  }
  return id as ServiceLineUserId;
};

/**
 * Convert unknown value to TaskTeamId with validation
 */
export const toTaskTeamId = (value: unknown): TaskTeamId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid TaskTeamId: ${value}`);
  }
  return id as TaskTeamId;
};

/**
 * Convert unknown value to OpportunityId with validation
 */
export const toOpportunityId = (value: unknown): OpportunityId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid OpportunityId: ${value}`);
  }
  return id as OpportunityId;
};

/**
 * Convert unknown value to ActivityId with validation
 */
export const toActivityId = (value: unknown): ActivityId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ActivityId: ${value}`);
  }
  return id as ActivityId;
};

/**
 * Convert unknown value to ContactId with validation
 */
export const toContactId = (value: unknown): ContactId => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ContactId: ${value}`);
  }
  return id as ContactId;
};


























