-- Migration: Add Service Line Master Table
-- This migration creates a master table for service lines to make them data-driven

-- Create ServiceLine master table
CREATE TABLE [ServiceLineMaster] (
  [code] NVARCHAR(50) PRIMARY KEY,
  [name] NVARCHAR(200) NOT NULL,
  [description] NVARCHAR(500),
  [active] BIT NOT NULL DEFAULT 1,
  [sortOrder] INT NOT NULL DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
  [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Create index for active service lines
CREATE INDEX IDX_ServiceLineMaster_Active ON [ServiceLineMaster]([active]);
CREATE INDEX IDX_ServiceLineMaster_SortOrder ON [ServiceLineMaster]([sortOrder]);

-- Insert default service lines
INSERT INTO [ServiceLineMaster] ([code], [name], [description], [sortOrder]) VALUES
  ('TAX', 'Tax Services', 'Tax consulting, compliance, and advisory services', 1),
  ('AUDIT', 'Audit & Assurance', 'Financial audit and assurance services', 2),
  ('ACCOUNTING', 'Accounting', 'Accounting and bookkeeping services', 3),
  ('ADVISORY', 'Advisory', 'Business advisory and consulting services', 4),
  ('QRM', 'Quality & Risk Management', 'Quality assurance and risk management', 5),
  ('BUSINESS_DEV', 'Business Development', 'Business development and client relations', 6),
  ('IT', 'Information Technology', 'IT services and support', 7),
  ('FINANCE', 'Finance', 'Finance and financial management', 8),
  ('HR', 'Human Resources', 'Human resources and people management', 9);


