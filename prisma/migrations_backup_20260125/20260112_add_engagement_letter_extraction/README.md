# Engagement Letter Extraction Migration

**Migration Date:** 2026-01-12  
**Migration Name:** `20260112_add_engagement_letter_extraction`

## Purpose

Adds metadata fields to the `TaskEngagementLetter` table to support automated extraction and validation of engagement letters and DPAs using Azure Document Intelligence and AI.

## Changes

### New Fields - Engagement Letter Extraction

- `elExtractionStatus` - Extraction status (PENDING, SUCCESS, FAILED)
- `elExtractionError` - Error message if extraction fails
- `elLetterDate` - Date extracted from engagement letter
- `elLetterAge` - Age in days (calculated from letter date)
- `elSigningPartner` - Partner name extracted from document
- `elSigningPartnerCode` - Matched employee code
- `elServicesCovered` - JSON array of services mentioned
- `elHasPartnerSignature` - Boolean for partner signature on EL
- `elHasClientSignature` - Boolean for client signature on EL
- `elHasTermsConditions` - Boolean for T&C section presence
- `elHasTcPartnerSignature` - Boolean for partner signature on T&C
- `elHasTcClientSignature` - Boolean for client signature on T&C
- `elExtractedText` - Full extracted text (for debugging, optional)

### New Fields - DPA Extraction

- `dpaExtractionStatus` - Extraction status (PENDING, SUCCESS, FAILED)
- `dpaExtractionError` - Error message if extraction fails
- `dpaLetterDate` - Date extracted from DPA
- `dpaLetterAge` - Age in days (calculated from DPA date)
- `dpaSigningPartner` - Partner name extracted from DPA
- `dpaSigningPartnerCode` - Matched employee code
- `dpaHasPartnerSignature` - Boolean for partner/firm signature
- `dpaHasClientSignature` - Boolean for client signature
- `dpaExtractedText` - Full extracted text (for debugging, optional)

### Indexes Added

- `idx_taskengagementletter_elextractionstatus` - Query by extraction status
- `idx_taskengagementletter_dpaextractionstatus` - Query by DPA status
- `idx_taskengagementletter_elletterdate` - Query/sort by letter date
- `idx_taskengagementletter_dpaletterdate` - Query/sort by DPA date

## Impact

### Database

- **Table Modified:** `TaskEngagementLetter`
- **New Columns:** 22 (all nullable)
- **New Indexes:** 4
- **Backward Compatible:** Yes (all fields nullable)

### Application

- **Breaking Changes:** None
- **New Features:** Automated document extraction and validation
- **Required Services:** Azure Document Intelligence, Azure OpenAI

## Rollback

If needed, columns can be safely dropped as they are nullable and not referenced by foreign keys.

```sql
-- Rollback script (if needed)
BEGIN TRANSACTION;

-- Drop indexes
DROP INDEX idx_taskengagementletter_elextractionstatus ON TaskEngagementLetter;
DROP INDEX idx_taskengagementletter_dpaextractionstatus ON TaskEngagementLetter;
DROP INDEX idx_taskengagementletter_elletterdate ON TaskEngagementLetter;
DROP INDEX idx_taskengagementletter_dpaletterdate ON TaskEngagementLetter;

-- Drop engagement letter extraction columns
ALTER TABLE TaskEngagementLetter DROP COLUMN elExtractionStatus;
ALTER TABLE TaskEngagementLetter DROP COLUMN elExtractionError;
ALTER TABLE TaskEngagementLetter DROP COLUMN elLetterDate;
ALTER TABLE TaskEngagementLetter DROP COLUMN elLetterAge;
ALTER TABLE TaskEngagementLetter DROP COLUMN elSigningPartner;
ALTER TABLE TaskEngagementLetter DROP COLUMN elSigningPartnerCode;
ALTER TABLE TaskEngagementLetter DROP COLUMN elServicesCovered;
ALTER TABLE TaskEngagementLetter DROP COLUMN elHasPartnerSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN elHasClientSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN elHasTermsConditions;
ALTER TABLE TaskEngagementLetter DROP COLUMN elHasTcPartnerSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN elHasTcClientSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN elExtractedText;

-- Drop DPA extraction columns
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaExtractionStatus;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaExtractionError;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaLetterDate;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaLetterAge;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaSigningPartner;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaSigningPartnerCode;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaHasPartnerSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaHasClientSignature;
ALTER TABLE TaskEngagementLetter DROP COLUMN dpaExtractedText;

COMMIT TRANSACTION;
```

## Testing

After applying this migration:

1. Verify columns exist: `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TaskEngagementLetter'`
2. Verify indexes exist: `SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('TaskEngagementLetter')`
3. Test engagement letter upload with extraction
4. Test DPA upload with extraction
5. Verify extracted metadata displays correctly

## Related Files

- **Service:** `src/lib/services/documents/engagementLetterExtraction.ts`
- **Service:** `src/lib/services/documents/dpaExtraction.ts`
- **API:** `src/app/api/tasks/[id]/engagement-letter/route.ts`
- **API:** `src/app/api/tasks/[id]/dpa/route.ts`
- **UI:** `src/components/features/tasks/EngagementLetterTab.tsx`
- **Types:** `src/types/index.ts`
- **Schema:** `prisma/schema.prisma`
- **Docs:** `docs/ENGAGEMENT_LETTER_EXTRACTION.md`

## Notes

- All new fields are nullable for backward compatibility
- Extraction happens synchronously during upload (10-30 seconds)
- Failed uploads do not create database records
- Extraction errors are logged with detailed messages
