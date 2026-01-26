-- Migration: Add Vault Document Approval Route
-- Description: Add approval route configuration for VAULT_DOCUMENT workflow type

-- =====================================================
-- Add VAULT_DOCUMENT Approval Route
-- =====================================================
-- Documents require administrator approval
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'VAULT_DOCUMENT',
  'admin-approval',
  'Requires administrator approval for document vault uploads',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"ADMINISTRATOR","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  GETDATE(),
  GETDATE()
);
