# Vault Document Blob Storage Path Structure

## Overview

Implemented a hierarchical blob storage path structure for vault documents that organizes files by scope, document type, and category for better organization and discoverability.

## Path Structure

### Permanent Documents

```
vault/{scope}/{documentType}/{category}/{documentId}/v{systemVersion}_{timestamp}_{filename}
```

**Components:**
- `scope`: `global` for GLOBAL scope, or service line code (e.g., `TAX`, `AUDIT`, `FINANCE`)
- `documentType`: Document type code (e.g., `POLICY`, `SOP`, `TEMPLATE`)
- `category`: Sanitized category name (e.g., `HR-Policies`, `Tax-Procedures`)
- `documentId`: Numeric document ID from database
- `systemVersion`: System-tracked revision number (1, 2, 3, etc.)
- `timestamp`: Unix timestamp for uniqueness
- `filename`: Sanitized original filename

### Temporary Documents

```
vault/temp/{userId}/{timestamp}_{filename}
```

Used during AI extraction workflow before final submission.

## Example Paths

```
vault/global/POLICY/HR-Policies/123/v1_1704567890123_Employee-Handbook.pdf
vault/TAX/SOP/Tax-Procedures/456/v2_1704567890456_Tax-Filing-Guide.pdf
vault/AUDIT/TEMPLATE/Audit-Templates/789/v1_1704567890789_Audit-Checklist.xlsx
vault/FINANCE/POLICY/Finance-Policies/890/v1_1704567890890_Disbursement-Policy.pdf
vault/temp/user-123/1704567890999_Disbursement-Policy.pdf
```

## Dual Version Tracking

The system now tracks TWO types of versions:

### 1. System Version (Database Field: `version`)
- Database-managed revision history
- Auto-increments: 1, 2, 3, etc.
- Used for tracking system revisions when users upload new versions
- Part of the blob storage path: `v1_`, `v2_`, etc.

### 2. Document Version (Database Field: `documentVersion`)
- AI-detected internal version from document content
- Examples: "1.0", "2.1", "Rev 3", "Draft 2"
- Extracted from document headers, footers, or content
- Optional field - null if no version indicator found
- NOT part of the blob path

## Benefits

1. **Organized Storage**: Documents grouped logically by scope → type → category
2. **Easy Discovery**: Can browse blob storage hierarchically
3. **Version Tracking**: Both system revisions AND document internal versions tracked
4. **Consistent Paths**: All vault documents follow same structure
5. **Better Metadata**: Blob metadata includes organizational info
6. **Scalable**: Structure supports any number of categories/types

## AI Version Detection

The AI extraction service automatically detects document version numbers from content:

**Detection Patterns:**
- Labels: "Version:", "Ver:", "V:", "Rev:", "Revision:", "Release:", "Draft:"
- Formats: "1.0", "2.1", "v3.2", "Rev 4", "Draft 1", "r5"
- Locations: header, footer, first page, title page

**Examples:**
- Document header shows "Version 2.1" → AI extracts "2.1"
- Footer shows "Rev 3" → AI extracts "Rev 3"
- Title page shows "Draft 1" → AI extracts "Draft 1"
- No version found → AI returns null

## Implementation Details

### Blob Storage Functions

**File:** `src/lib/services/documents/blobStorage.ts`

#### uploadVaultDocument
```typescript
uploadVaultDocument(
  buffer: Buffer,
  fileName: string,
  documentId: number,
  version: number,
  scope: string,
  documentType: string,
  categoryName: string
): Promise<string>
```

#### moveVaultDocumentFromTemp
```typescript
moveVaultDocumentFromTemp(
  tempBlobName: string,
  documentId: number,
  version: number,
  scope: string,
  documentType: string,
  categoryName: string
): Promise<string>
```

#### uploadVaultDocumentTemp
```typescript
uploadVaultDocumentTemp(
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<string>
```

### Database Schema

**Added field to `VaultDocument` table:**
```sql
documentVersion NVARCHAR(50) NULL
```

Stores AI-detected internal version number from document content.

### AI Extraction

**Schema field added:**
```typescript
documentVersion: z.string().nullable()
```

**AI Prompt instruction added:**
```
10. DOCUMENT VERSION:
   - Look for version indicators in the document content
   - Common labels: "Version:", "Ver:", "V:", "Rev:", "Revision:", "Release:", "Draft:"
   - Common formats: "1.0", "2.1", "v3.2", "Rev 4", "Draft 1", "r5"
   - Return the version string exactly as found
   - Return null if no clear version indicator is found
```

## Migration

**Migration file created:** `prisma/migrations/20260116_add_document_version_field/`

To apply the migration:
```bash
npm run migrate:azure
```

## UI Updates

**Document Upload Form:**
- Added "Document Version" input field (optional)
- AI suggestions panel shows detected version with "Use This" button
- Version is included in "Accept All Suggestions" action

## Files Modified

1. `src/lib/services/documents/blobStorage.ts` - Updated path structure for all vault functions
2. `src/lib/services/document-vault/documentVaultExtractionService.ts` - Added version detection
3. `src/app/api/admin/document-vault/route.ts` - Pass additional params, store documentVersion
4. `src/app/api/document-vault/admin/route.ts` - Pass additional params, store documentVersion
5. `src/components/features/document-vault/DocumentUploadForm.tsx` - Display version in UI
6. `src/lib/validation/schemas.ts` - Added documentVersion to schema
7. `prisma/schema.prisma` - Added documentVersion field
8. `prisma/migrations/20260116_add_document_version_field/` - Created migration

## Testing

Test with documents containing various version formats:
- "Version 1.0" in header
- "Rev 3" in footer
- "Draft 2" in title
- "v2.1" near effective date
- Documents with no version indicator

Verify:
- Blob paths follow new hierarchical structure
- AI correctly detects and extracts version strings
- Documents stored in correct category folders
- Both GLOBAL and SERVICE_LINE scopes work correctly
