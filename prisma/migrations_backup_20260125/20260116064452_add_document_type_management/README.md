# Document Type Management Migration

**Date:** 2026-01-16  
**Purpose:** Convert hardcoded document types to database-managed types for system admin flexibility.

## What This Migration Does

### Changes Made

1. **Creates VaultDocumentType Table**
   - Stores document type definitions (code, name, description, icon, color)
   - Code is unique and used as foreign key reference
   - Supports active/inactive status and custom sorting
   - Six pre-seeded types: POLICY, SOP, TEMPLATE, MARKETING, TRAINING, OTHER

2. **Removes Hardcoded Constraint**
   - Drops `CK_VaultDocument_DocumentType` CHECK constraint
   - Allows admins to create custom document types beyond original six

3. **Adds Foreign Key Relationships**
   - VaultDocument.documentType → VaultDocumentType.code (required)
   - VaultDocumentCategory.documentType → VaultDocumentType.code (optional)
   - Ensures referential integrity

### Benefits

- ✅ System admins can create custom document types
- ✅ Document types can be activated/deactivated
- ✅ Custom icons and colors per type
- ✅ Flexible sorting and organization
- ✅ No code changes needed to add new types

### Migration Safety

- **Non-Breaking**: Existing document types are seeded before constraint changes
- **Data Preserved**: All existing documents maintain their documentType values
- **Foreign Keys**: Enforce data integrity going forward

## Rollback

To rollback this migration:

```sql
-- Remove foreign key constraints
ALTER TABLE [dbo].[VaultDocument]
DROP CONSTRAINT [FK_VaultDocument_DocumentType];

ALTER TABLE [dbo].[VaultDocumentCategory]
DROP CONSTRAINT [FK_VaultDocumentCategory_DocumentType];

-- Re-add CHECK constraint
ALTER TABLE [dbo].[VaultDocument]
ADD CONSTRAINT [CK_VaultDocument_DocumentType] 
CHECK ([documentType] IN ('POLICY', 'SOP', 'TEMPLATE', 'MARKETING', 'TRAINING', 'OTHER'));

-- Drop table
DROP TABLE [dbo].[VaultDocumentType];
```

## Next Steps

1. Update Prisma schema to include VaultDocumentType model
2. Create API routes for document type CRUD operations
3. Build admin UI for managing document types
4. Update forms to fetch document types dynamically
