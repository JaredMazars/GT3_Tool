-- Migration: Add Document Vault System
-- Description: Creates tables for firm-wide document management including policies, SOPs, templates, marketing materials, and training documents

-- =====================================================
-- 1. VaultDocumentCategory Table
-- =====================================================
CREATE TABLE [dbo].[VaultDocumentCategory] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [icon] NVARCHAR(50),
    [color] NVARCHAR(20),
    [documentType] NVARCHAR(50),
    [active] BIT NOT NULL DEFAULT 1,
    [sortOrder] INT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_VaultDocumentCategory] PRIMARY KEY CLUSTERED ([id] ASC)
);

-- Indexes for VaultDocumentCategory
CREATE INDEX [IX_VaultDocumentCategory_Active] ON [dbo].[VaultDocumentCategory]([active]);
CREATE INDEX [IX_VaultDocumentCategory_DocumentType] ON [dbo].[VaultDocumentCategory]([documentType]);
CREATE INDEX [IX_VaultDocumentCategory_SortOrder] ON [dbo].[VaultDocumentCategory]([sortOrder]);

-- =====================================================
-- 2. VaultDocument Table
-- =====================================================
CREATE TABLE [dbo].[VaultDocument] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(MAX),
    [documentType] NVARCHAR(50) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [categoryId] INT NOT NULL,
    [scope] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [version] INT NOT NULL DEFAULT 1,
    [status] NVARCHAR(50) NOT NULL,
    [approvalId] INT,
    [aiExtractionStatus] NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    [aiSummary] NVARCHAR(MAX),
    [aiKeyPoints] NVARCHAR(MAX),
    [aiExtractedText] NVARCHAR(MAX),
    [effectiveDate] DATE,
    [expiryDate] DATE,
    [tags] NVARCHAR(MAX),
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [publishedAt] DATETIME2,
    [archivedAt] DATETIME2,
    [archivedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_VaultDocument] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_VaultDocument_Category] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[VaultDocumentCategory]([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_VaultDocument_Approval] FOREIGN KEY ([approvalId]) REFERENCES [dbo].[Approval]([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_VaultDocument_User] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_VaultDocument_ServiceLineMaster] FOREIGN KEY ([serviceLine]) REFERENCES [dbo].[ServiceLineMaster]([code]) ON DELETE NO ACTION,
    CONSTRAINT [CK_VaultDocument_Status] CHECK ([status] IN ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT [CK_VaultDocument_Scope] CHECK ([scope] IN ('GLOBAL', 'SERVICE_LINE')),
    CONSTRAINT [CK_VaultDocument_DocumentType] CHECK ([documentType] IN ('POLICY', 'SOP', 'TEMPLATE', 'MARKETING', 'TRAINING', 'OTHER')),
    CONSTRAINT [CK_VaultDocument_AIExtractionStatus] CHECK ([aiExtractionStatus] IN ('PENDING', 'SUCCESS', 'FAILED'))
);

-- Indexes for VaultDocument
CREATE INDEX [IX_VaultDocument_Status] ON [dbo].[VaultDocument]([status]);
CREATE INDEX [IX_VaultDocument_Scope] ON [dbo].[VaultDocument]([scope]);
CREATE INDEX [IX_VaultDocument_ServiceLine] ON [dbo].[VaultDocument]([serviceLine]);
CREATE INDEX [IX_VaultDocument_CategoryId] ON [dbo].[VaultDocument]([categoryId]);
CREATE INDEX [IX_VaultDocument_DocumentType] ON [dbo].[VaultDocument]([documentType]);
CREATE INDEX [IX_VaultDocument_UploadedBy] ON [dbo].[VaultDocument]([uploadedBy]);
CREATE INDEX [IX_VaultDocument_PublishedAt] ON [dbo].[VaultDocument]([publishedAt]);
CREATE INDEX [IX_VaultDocument_ApprovalId] ON [dbo].[VaultDocument]([approvalId]);

-- Composite indexes for common query patterns
CREATE INDEX [IX_VaultDocument_Status_Scope_ServiceLine] ON [dbo].[VaultDocument]([status], [scope], [serviceLine]);
CREATE INDEX [IX_VaultDocument_DocumentType_CategoryId] ON [dbo].[VaultDocument]([documentType], [categoryId]);

-- =====================================================
-- 3. VaultDocumentVersion Table
-- =====================================================
CREATE TABLE [dbo].[VaultDocumentVersion] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [documentId] INT NOT NULL,
    [version] INT NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [filePath] NVARCHAR(500) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [supersededAt] DATETIME2,
    [changeNotes] NVARCHAR(MAX),
    CONSTRAINT [PK_VaultDocumentVersion] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_VaultDocumentVersion_Document] FOREIGN KEY ([documentId]) REFERENCES [dbo].[VaultDocument]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_VaultDocumentVersion_User] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION,
    CONSTRAINT [UQ_VaultDocumentVersion_DocumentId_Version] UNIQUE ([documentId], [version])
);

-- Indexes for VaultDocumentVersion
CREATE INDEX [IX_VaultDocumentVersion_DocumentId] ON [dbo].[VaultDocumentVersion]([documentId]);
CREATE INDEX [IX_VaultDocumentVersion_Version] ON [dbo].[VaultDocumentVersion]([version]);
CREATE INDEX [IX_VaultDocumentVersion_DocumentId_Version] ON [dbo].[VaultDocumentVersion]([documentId], [version]);

-- =====================================================
-- 4. Seed Data - Document Categories
-- =====================================================

-- Policies & Procedures
INSERT INTO [dbo].[VaultDocumentCategory] ([name], [description], [icon], [color], [documentType], [active], [sortOrder])
VALUES 
    ('HR Policies', 'Human Resources policies and procedures', 'Users', '#3B82F6', 'POLICY', 1, 1),
    ('IT Procedures', 'Information Technology procedures and guidelines', 'Server', '#8B5CF6', 'POLICY', 1, 2),
    ('Compliance & Risk Management', 'Compliance requirements and risk management policies', 'Shield', '#EF4444', 'POLICY', 1, 3),
    ('Quality Management', 'Quality assurance and management standards', 'Award', '#F59E0B', 'POLICY', 1, 4),
    ('Finance & Accounting Policies', 'Financial and accounting policies', 'DollarSign', '#10B981', 'POLICY', 1, 5),
    ('Health & Safety', 'Workplace health and safety policies', 'Heart', '#EC4899', 'POLICY', 1, 6),
    ('Data Protection & Privacy', 'Data protection and privacy policies', 'Lock', '#6366F1', 'POLICY', 1, 7);

-- Operational
INSERT INTO [dbo].[VaultDocumentCategory] ([name], [description], [icon], [color], [documentType], [active], [sortOrder])
VALUES 
    ('Standard Operating Procedures', 'Step-by-step operational procedures', 'List', '#2E5AAC', 'SOP', 1, 10),
    ('Client Service Standards', 'Standards for client service delivery', 'Users', '#0EA5E9', 'SOP', 1, 11),
    ('Internal Processes', 'Internal operational processes', 'Settings', '#64748B', 'SOP', 1, 12),
    ('Workflow Guidelines', 'Workflow and process guidelines', 'GitBranch', '#8B5CF6', 'SOP', 1, 13);

-- Templates
INSERT INTO [dbo].[VaultDocumentCategory] ([name], [description], [icon], [color], [documentType], [active], [sortOrder])
VALUES 
    ('Letterheads & Stationery', 'Company letterheads and stationery templates', 'FileText', '#2E5AAC', 'TEMPLATE', 1, 20),
    ('Proposal Templates', 'Templates for client proposals', 'FileCheck', '#10B981', 'TEMPLATE', 1, 21),
    ('Report Templates', 'Templates for reports and documentation', 'FileSpreadsheet', '#F59E0B', 'TEMPLATE', 1, 22),
    ('Form Templates', 'Standard forms and applications', 'ClipboardList', '#6366F1', 'TEMPLATE', 1, 23),
    ('Email Templates', 'Email templates for common communications', 'Mail', '#8B5CF6', 'TEMPLATE', 1, 24);

-- Marketing & Brand
INSERT INTO [dbo].[VaultDocumentCategory] ([name], [description], [icon], [color], [documentType], [active], [sortOrder])
VALUES 
    ('Marketing Materials', 'Marketing brochures and materials', 'Megaphone', '#EC4899', 'MARKETING', 1, 30),
    ('Brand Guidelines', 'Brand identity and usage guidelines', 'Palette', '#2E5AAC', 'MARKETING', 1, 31),
    ('Presentations', 'Presentation templates and decks', 'Presentation', '#8B5CF6', 'MARKETING', 1, 32),
    ('Brochures & Collateral', 'Printed materials and collateral', 'BookOpen', '#F59E0B', 'MARKETING', 1, 33),
    ('Social Media Assets', 'Social media templates and assets', 'Share2', '#0EA5E9', 'MARKETING', 1, 34);

-- Training & Development
INSERT INTO [dbo].[VaultDocumentCategory] ([name], [description], [icon], [color], [documentType], [active], [sortOrder])
VALUES 
    ('Training Materials', 'Training guides and materials', 'BookOpen', '#10B981', 'TRAINING', 1, 40),
    ('User Guides', 'User manuals and guides', 'FileText', '#6366F1', 'TRAINING', 1, 41),
    ('Technical Documentation', 'Technical documentation and references', 'Code', '#64748B', 'TRAINING', 1, 42),
    ('Onboarding Resources', 'New employee onboarding resources', 'UserPlus', '#EC4899', 'TRAINING', 1, 43);

-- =====================================================
-- 5. Add VAULT_DOCUMENT workflow type to Approval system
-- =====================================================
-- Note: The WorkflowType enum is already flexible in the Approval table
-- No schema change needed, just document the new type for reference
