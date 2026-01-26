# Document Vault Migration

**Date:** 2026-01-15  
**Purpose:** Add comprehensive document management system for firm policies, SOPs, templates, marketing materials, and training documents.

## What This Migration Does

### Tables Created

1. **VaultDocumentCategory**
   - Categories for organizing documents (HR Policies, IT Procedures, Templates, etc.)
   - Support for document type classification
   - 25 pre-seeded categories across 5 document types

2. **VaultDocument**
   - Main document registry with version control
   - AI-powered summarization and key point extraction
   - Approval workflow integration
   - Service line scoping support
   - Tag system for searchability

3. **VaultDocumentVersion**
   - Version history tracking
   - Full audit trail of document changes
   - Superseded version management

### Document Types Supported

- **POLICY** - Firm policies and compliance documents
- **SOP** - Standard Operating Procedures
- **TEMPLATE** - Letterheads, forms, report templates
- **MARKETING** - Marketing materials, brand guidelines
- **TRAINING** - Training materials, user guides
- **OTHER** - General documents

### Features

- ✅ Version control with full history
- ✅ AI-powered document summarization
- ✅ Approval workflow integration
- ✅ Service line scoping (global vs service-line-specific)
- ✅ Tag-based search and organization
- ✅ Category management with icons and colors
- ✅ Soft delete (archive) support
- ✅ Effective date and expiry date tracking

### Integration Points

- **Approval System**: Uses existing `Approval` table with workflow type `VAULT_DOCUMENT`
- **User System**: Links to `User` table for uploader/archiver tracking
- **Service Lines**: Links to `ServiceLineMaster` for service-line-specific documents

## Rollback

To rollback this migration:

```sql
DROP TABLE [dbo].[VaultDocumentVersion];
DROP TABLE [dbo].[VaultDocument];
DROP TABLE [dbo].[VaultDocumentCategory];
```

## Next Steps

1. Update Prisma schema to include new tables
2. Implement blob storage container for document files
3. Create AI extraction service for document processing
4. Build API routes for document management
5. Create frontend pages for user access and admin management
