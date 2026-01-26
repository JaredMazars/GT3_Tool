# Document Vault AI Extraction Feature

## Overview

Implemented AI-powered document field extraction for the document vault upload workflow. When users upload documents, they can now use AI to automatically extract and suggest form field values (title, description, document type, category, tags, dates) before submitting.

## Implementation Summary

### 1. Extraction Service
**File:** `src/lib/services/document-vault/documentVaultExtractionService.ts`

- `extractContentFromDocument()` - Uses Azure Document Intelligence to extract text from PDFs
- `generateVaultDocumentSuggestions()` - Uses Azure OpenAI to analyze content and suggest form fields
- `processUploadedDocument()` - Orchestrates the extraction workflow

**AI Suggestions Schema:**
```typescript
{
  title: string (max 200 chars)
  description: string (max 1000 chars)
  documentType: 'POLICY' | 'SOP' | 'TEMPLATE' | 'MARKETING' | 'TRAINING' | 'OTHER'
  suggestedCategory: string | null (single category name from database, or null)
  scope: 'GLOBAL' | 'SERVICE_LINE'
  serviceLine: string | null
  tags: string[] (max 10)
  effectiveDate: string | null (ISO date)
  expiryDate: string | null (ISO date)
  confidence: number (0-1)
  warnings: string[]
}
```

### 2. Temporary Blob Storage
**File:** `src/lib/services/documents/blobStorage.ts`

Added three new functions for temporary file handling:
- `uploadVaultDocumentTemp()` - Uploads to `temp/{userId}/{timestamp}-{filename}` path
- `moveVaultDocumentFromTemp()` - Moves temp file to permanent location after submission
- `deleteVaultDocumentTemp()` - Cleanup for cancelled uploads

### 3. Extraction API Endpoint
**File:** `src/app/api/document-vault/extract/route.ts`

New endpoint: `POST /api/document-vault/extract`

**Workflow:**
1. Accepts file upload
2. Validates file type and size (max 50MB)
3. Extracts text using Document Intelligence
4. Fetches categories from database
5. Generates AI field suggestions
6. Uploads to temporary blob storage
7. Returns suggestions + metadata to frontend

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": { /* AI suggestions */ },
    "extractedText": "preview...",
    "documentMetadata": {
      "fileName": "document.pdf",
      "tempBlobPath": "temp/userId/timestamp_document.pdf",
      "fileSize": 1234567,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 4. Updated Upload Form
**File:** `src/components/features/document-vault/DocumentUploadForm.tsx`

**New Features:**
- "Extract from Document with AI" button appears after file selection
- Loading state during extraction: "AI is analyzing your document..."
- AI suggestions panel with individual "Use This" buttons for each field
- "Accept All Suggestions" button to apply all at once
- Category matching (AI suggests names, UI matches to IDs)
- Confidence indicator and warnings display
- Error handling with user-friendly messages

**UI Design:**
- Follows Forvis design system
- Blue gradient backgrounds for AI features
- Sparkles icon to indicate AI functionality
- Alert badges for low confidence or warnings

### 5. Updated Submission API
**File:** `src/app/api/admin/document-vault/route.ts`

**Changes:**
- Added support for optional `tempBlobPath` in metadata
- If `tempBlobPath` provided: moves file from temp to permanent location
- If `tempBlobPath` not provided: uploads file normally (existing behavior)
- Skips background AI extraction if using AI workflow (already extracted)

**Updated Schema:**
**File:** `src/lib/validation/schemas.ts`
- Added `tempBlobPath?: string` to `CreateVaultDocumentSchema`

## User Workflow

1. **Upload Document**
   - User drags/drops or selects document file
   - File is displayed with name and size

2. **Extract with AI** (Optional)
   - User clicks "Extract from Document with AI" button
   - Loading indicator: "AI is analyzing your document..."
   - API extracts text and generates suggestions (5-15 seconds)

3. **Review Suggestions**
   - AI suggestions panel appears with all extracted fields
   - Confidence score and warnings displayed if needed
   - User can:
     - Accept individual suggestions ("Use This" button)
     - Accept all suggestions at once
     - Edit any field manually
     - Reject and fill form manually

4. **Submit**
   - User makes final adjustments
   - Clicks "Upload Document"
   - Document moved from temp to permanent storage
   - Normal approval workflow continues

## Technical Details

### AI Prompt Engineering

The AI prompt is carefully structured to:
- Provide document context (filename, extracted text)
- List available categories with descriptions
- Give specific instructions for each field type
- Handle edge cases (missing dates, unclear content)
- Return structured JSON responses

**Temperature:** 0.3 (lower for more deterministic classification)

**Model:** Uses `models.mini` (GPT-4 mini) for cost-effective extraction

### Error Handling

**Graceful Degradation:**
- If AI extraction fails: show error, allow manual entry
- If Document Intelligence fails: suggest different file format
- If confidence < 0.7: show warning badge
- If no categories match: suggest "OTHER" type

**User-Friendly Messages:**
- "Failed to extract content from document. Please try a different file or fill the form manually."
- "This document appears to be an image-based PDF. Text extraction may be incomplete."
- "Low confidence - please review carefully"

### Security & Performance

**Security:**
- Uses `secureRoute.fileUpload()` (includes rate limiting)
- Permission check: `Feature.MANAGE_VAULT_DOCUMENTS`
- File type and size validation
- Temporary files isolated by user ID

**Performance:**
- Document Intelligence: ~3-10 seconds
- AI analysis: ~2-5 seconds
- Total: ~5-15 seconds
- Clear progress indicators throughout

### Supported File Types

Currently supports PDF extraction (Document Intelligence limitation):
- application/pdf

Other file types accepted for upload but may have limited text extraction:
- DOCX, XLSX, PPTX
- PNG, JPEG, SVG
- TXT, MD

## Future Enhancements

- Support for more file formats (Word, Excel, PowerPoint)
- Bulk document upload with batch AI processing
- Learning from user corrections
- Document similarity detection
- OCR improvements for image-based PDFs
- Cleanup job for temp files older than 24 hours

## Testing

**Test with:**
1. Policy document with clear effective/expiry dates
2. SOP with step-by-step instructions
3. Template document (engagement letter, proposal)
4. Marketing material with brand guidelines
5. Training material with learning objectives
6. Image-based PDF (to test OCR limits)

**Validate:**
- AI correctly identifies document types
- Category matching accuracy
- Date extraction (various formats)
- Scope detection (GLOBAL vs SERVICE_LINE)
- Null handling for missing dates
- Error messages for unsupported formats

## Files Created/Modified

**Created:**
- `src/lib/services/document-vault/documentVaultExtractionService.ts`
- `src/app/api/document-vault/extract/route.ts`
- `docs/DOCUMENT_VAULT_AI_EXTRACTION.md`

**Modified:**
- `src/components/features/document-vault/DocumentUploadForm.tsx`
- `src/lib/services/documents/blobStorage.ts`
- `src/app/api/admin/document-vault/route.ts`
- `src/lib/validation/schemas.ts`

## Dependencies

No new dependencies required. Uses existing infrastructure:
- Azure Document Intelligence
- Azure OpenAI (AI SDK)
- Azure Blob Storage
- Existing UI components

## Deployment Notes

Ensure environment variables are configured:
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `AZURE_OPENAI_API_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
