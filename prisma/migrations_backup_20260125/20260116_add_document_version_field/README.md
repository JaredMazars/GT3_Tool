# Add Document Version Field Migration

## Purpose

Adds `documentVersion` field to `VaultDocument` table to store AI-detected internal version numbers found in document content.

## Changes

### VaultDocument Table

- **New field**: `documentVersion NVARCHAR(50) NULL`

## Version Tracking

This migration introduces dual version tracking:

1. **System Version** (`version` field): Database-managed revision history (1, 2, 3, etc.)
   - Increments each time a new version is uploaded
   - Used for tracking system revisions

2. **Document Version** (`documentVersion` field): AI-detected internal version from document content
   - Examples: "1.0", "2.1", "Rev 3", "Draft 2"
   - Extracted from document headers, footers, or content
   - Optional - null if no version indicator found

## Usage

The AI extraction service (`documentVaultExtractionService.ts`) will automatically detect and extract version numbers from document content during upload.

## Rollback

To rollback this migration:

```sql
ALTER TABLE [dbo].[VaultDocument]
DROP COLUMN [documentVersion];
```

## Applied

Run this migration using:
```bash
npm run migrate:azure
```
