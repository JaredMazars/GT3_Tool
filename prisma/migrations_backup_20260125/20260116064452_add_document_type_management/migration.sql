-- Migration: Add Document Type Management
-- Description: Convert hardcoded document types to database-managed types for admin flexibility

-- =====================================================
-- 1. Create VaultDocumentType Table
-- =====================================================
CREATE TABLE [dbo].[VaultDocumentType] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [active] BIT NOT NULL DEFAULT 1,
    [sortOrder] INT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_VaultDocumentType] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_VaultDocumentType_Code] UNIQUE ([code])
);

-- Indexes for VaultDocumentType
CREATE INDEX [IX_VaultDocumentType_Active] ON [dbo].[VaultDocumentType]([active]);
CREATE INDEX [IX_VaultDocumentType_SortOrder] ON [dbo].[VaultDocumentType]([sortOrder]);

-- =====================================================
-- 2. Seed Existing Document Types
-- =====================================================
INSERT INTO [dbo].[VaultDocumentType] ([code], [name], [description], [icon], [color], [sortOrder])
VALUES 
  ('POLICY', 'Policy', 'Firm policies and compliance documents', 'FileCheck', '#2E5AAC', 10),
  ('SOP', 'SOP', 'Standard Operating Procedures', 'FileText', '#5B93D7', 20),
  ('TEMPLATE', 'Template', 'Letterheads, forms, report templates', 'FolderOpen', '#D9CBA8', 30),
  ('MARKETING', 'Marketing', 'Marketing materials and brand guidelines', 'Megaphone', '#059669', 40),
  ('TRAINING', 'Training', 'Training materials and user guides', 'GraduationCap', '#7C3AED', 50),
  ('OTHER', 'Other', 'General documents', 'HelpCircle', '#6C757D', 60);

-- =====================================================
-- 3. Remove CHECK Constraint on VaultDocument
-- =====================================================
ALTER TABLE [dbo].[VaultDocument]
DROP CONSTRAINT [CK_VaultDocument_DocumentType];

-- =====================================================
-- 4. Add Foreign Key Constraints
-- =====================================================
-- Add FK from VaultDocument to VaultDocumentType
ALTER TABLE [dbo].[VaultDocument]
ADD CONSTRAINT [FK_VaultDocument_DocumentType] 
FOREIGN KEY ([documentType]) 
REFERENCES [dbo].[VaultDocumentType]([code]) 
ON DELETE NO ACTION
ON UPDATE NO ACTION;

-- Add FK from VaultDocumentCategory to VaultDocumentType (nullable)
ALTER TABLE [dbo].[VaultDocumentCategory]
ADD CONSTRAINT [FK_VaultDocumentCategory_DocumentType] 
FOREIGN KEY ([documentType]) 
REFERENCES [dbo].[VaultDocumentType]([code]) 
ON DELETE NO ACTION
ON UPDATE NO ACTION;
