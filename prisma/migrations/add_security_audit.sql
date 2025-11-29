-- Migration: Add security audit logging capabilities
-- This migration adds audit fields to security tables and creates audit log table

-- Create SecurityAuditLog table
CREATE TABLE [SecurityAuditLog] (
  [id] INT IDENTITY(1,1) PRIMARY KEY,
  [userId] NVARCHAR(255) NOT NULL,
  [performedBy] NVARCHAR(255) NOT NULL,
  [action] NVARCHAR(100) NOT NULL,
  [resourceType] NVARCHAR(100) NOT NULL,
  [resourceId] NVARCHAR(255),
  [oldValue] NVARCHAR(MAX),
  [newValue] NVARCHAR(MAX),
  [reason] NVARCHAR(500),
  [metadata] NVARCHAR(MAX),
  [ipAddress] NVARCHAR(45),
  [userAgent] NVARCHAR(500),
  [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_SecurityAuditLog_User FOREIGN KEY ([userId]) REFERENCES [User]([id]),
  CONSTRAINT FK_SecurityAuditLog_PerformedBy FOREIGN KEY ([performedBy]) REFERENCES [User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Add indexes for audit log
CREATE INDEX IDX_SecurityAuditLog_UserId ON [SecurityAuditLog]([userId]);
CREATE INDEX IDX_SecurityAuditLog_PerformedBy ON [SecurityAuditLog]([performedBy]);
CREATE INDEX IDX_SecurityAuditLog_Action ON [SecurityAuditLog]([action]);
CREATE INDEX IDX_SecurityAuditLog_ResourceType ON [SecurityAuditLog]([resourceType]);
CREATE INDEX IDX_SecurityAuditLog_CreatedAt ON [SecurityAuditLog]([createdAt] DESC);
CREATE INDEX IDX_SecurityAuditLog_UserId_CreatedAt ON [SecurityAuditLog]([userId], [createdAt] DESC);

-- Add audit fields to ServiceLineUser
ALTER TABLE [ServiceLineUser] ADD [createdBy] NVARCHAR(255);
ALTER TABLE [ServiceLineUser] ADD [updatedBy] NVARCHAR(255);
ALTER TABLE [ServiceLineUser] ADD [changeReason] NVARCHAR(500);

-- Add audit fields to RolePermission
ALTER TABLE [RolePermission] ADD [modifiedBy] NVARCHAR(255);
ALTER TABLE [RolePermission] ADD [changeReason] NVARCHAR(500);

-- Add audit fields to ProjectUser
ALTER TABLE [ProjectUser] ADD [addedBy] NVARCHAR(255);
ALTER TABLE [ProjectUser] ADD [removedBy] NVARCHAR(255);
ALTER TABLE [ProjectUser] ADD [removedAt] DATETIME2;

-- Add indexes for audit fields
CREATE INDEX IDX_ServiceLineUser_CreatedBy ON [ServiceLineUser]([createdBy]);
CREATE INDEX IDX_ServiceLineUser_UpdatedBy ON [ServiceLineUser]([updatedBy]);
CREATE INDEX IDX_RolePermission_ModifiedBy ON [RolePermission]([modifiedBy]);
CREATE INDEX IDX_ProjectUser_AddedBy ON [ProjectUser]([addedBy]);


