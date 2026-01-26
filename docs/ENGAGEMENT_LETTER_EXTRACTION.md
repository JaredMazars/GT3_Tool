# Engagement Letter & DPA Extraction Feature

## Overview

The Engagement Letter and DPA (Data Processing Agreement) extraction feature uses Azure Document Intelligence (Form Recognizer) and AI to automatically extract and validate key metadata from uploaded PDF documents during the engagement documentation workflow.

**Key Benefits:**
- Automated validation of signature presence
- Extraction of dates, partners, and services
- Reduced manual review burden
- Improved data quality and compliance

## Architecture

### Components

1. **Document Intelligence Service** (`documentIntelligence.ts`)
   - Extracts raw text from PDFs using Azure Document Intelligence
   - Handles polling for async processing results
   - Returns searchable text content

2. **Engagement Letter Extraction Service** (`engagementLetterExtraction.ts`)
   - Orchestrates text extraction and AI analysis
   - Validates extracted metadata
   - Matches partner names to employee codes

3. **DPA Extraction Service** (`dpaExtraction.ts`)
   - Similar to engagement letter service but simplified
   - Focuses on date, signatures, and partner identification

4. **AI Analysis** (GPT-5-Nano)
   - Analyzes extracted text using structured prompts
   - Returns structured JSON with confidence scores
   - Identifies dates, signatures, partners, and services

5. **API Routes**
   - `/api/tasks/[id]/engagement-letter` - Upload and validate engagement letters
   - `/api/tasks/[id]/dpa` - Upload and validate DPAs

6. **UI Components**
   - `EngagementLetterTab.tsx` - Displays upload interface and extracted metadata

### Data Flow

```
1. User uploads PDF
2. API validates file type (PDF only)
3. Document Intelligence extracts text (5-15 seconds)
4. AI analyzes text for structured data (2-5 seconds)
5. Validation checks all requirements
6. If valid: Save to blob storage + database
7. If invalid: Reject with detailed error messages
8. Display extracted metadata on UI
```

## Validation Requirements

### Engagement Letter

**Required signatures (4 total):**
- ✓ Partner signature on main engagement letter
- ✓ Client signature on main engagement letter
- ✓ Partner signature on Terms & Conditions section
- ✓ Client signature on Terms & Conditions section

**Required metadata:**
- ✓ Valid letter date (within last 5 years, not future)
- ✓ Identifiable signing partner name
- ✓ At least one service covered
- ✓ Terms & Conditions section present

### DPA

**Required signatures (2 total):**
- ✓ Partner/firm signature
- ✓ Client signature

**Required metadata:**
- ✓ Valid DPA date (within last 5 years, not future)
- ✓ Identifiable signing partner/representative name

## Extracted Metadata Fields

### Engagement Letter

| Field | Type | Description |
|-------|------|-------------|
| `elExtractionStatus` | String | SUCCESS, FAILED, PENDING |
| `elExtractionError` | String | Error message if extraction fails |
| `elLetterDate` | DateTime | Date of engagement letter |
| `elLetterAge` | Integer | Age in days (calculated) |
| `elSigningPartner` | String | Partner name extracted from document |
| `elSigningPartnerCode` | String | Matched employee code |
| `elServicesCovered` | JSON | Array of services mentioned |
| `elHasPartnerSignature` | Boolean | Partner signature on EL |
| `elHasClientSignature` | Boolean | Client signature on EL |
| `elHasTermsConditions` | Boolean | T&C section present |
| `elHasTcPartnerSignature` | Boolean | Partner signature on T&C |
| `elHasTcClientSignature` | Boolean | Client signature on T&C |

### DPA

| Field | Type | Description |
|-------|------|-------------|
| `dpaExtractionStatus` | String | SUCCESS, FAILED, PENDING |
| `dpaExtractionError` | String | Error message if extraction fails |
| `dpaLetterDate` | DateTime | Date of DPA |
| `dpaLetterAge` | Integer | Age in days (calculated) |
| `dpaSigningPartner` | String | Partner name extracted from document |
| `dpaSigningPartnerCode` | String | Matched employee code |
| `dpaHasPartnerSignature` | Boolean | Partner/firm signature present |
| `dpaHasClientSignature` | Boolean | Client signature present |

## User Experience

### Upload Flow

1. User navigates to task detail → Engagement Documentation tab
2. User selects PDF file for upload
3. System shows "Processing document..." message (10-30 seconds)
4. **Success:** Document uploaded, metadata displayed
5. **Failure:** Detailed error with requirements shown

### Success Display

After successful upload, users see:
- Letter date with age indicator
- Signing partner name and code
- Services covered (badges)
- Signature verification indicators (✓/✗)

### Error Messages

Errors are user-friendly and actionable:

**Example: Missing Signatures**
```
Upload Rejected: Missing Required Signatures

The engagement letter must include signatures from both the 
partner and client in TWO locations:
• Engagement letter main document (1/2 found)
• Terms and conditions section (0/2 found)

Requirements:
✓ Partner signature on engagement letter
✗ Client signature on engagement letter  
✗ Partner signature on Terms & Conditions
✗ Client signature on Terms & Conditions

Please ensure all parties have signed both sections before uploading.
```

## Technical Implementation

### API Integration

**Engagement Letter Upload:**

```typescript
// POST /api/tasks/[id]/engagement-letter
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch(`/api/tasks/${taskId}/engagement-letter`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();

if (response.ok) {
  // Success - data.data contains extracted metadata
  console.log(data.data.extractedMetadata);
} else {
  // Error - data.details contains validation errors
  console.error(data.details);
}
```

**DPA Upload:**

```typescript
// POST /api/tasks/[id]/dpa
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch(`/api/tasks/${taskId}/dpa`, {
  method: 'POST',
  body: formData,
});
```

### Database Schema

```sql
ALTER TABLE TaskEngagementLetter ADD elExtractionStatus NVARCHAR(20) NULL;
ALTER TABLE TaskEngagementLetter ADD elLetterDate DATETIME2 NULL;
ALTER TABLE TaskEngagementLetter ADD elSigningPartner NVARCHAR(100) NULL;
-- ... (see migration file for complete schema)
```

### Prisma Schema

```prisma
model TaskEngagementLetter {
  // ... existing fields
  
  // Engagement Letter extraction
  elExtractionStatus       String?
  elLetterDate             DateTime?
  elSigningPartner         String?
  // ... other extraction fields
  
  // DPA extraction  
  dpaExtractionStatus      String?
  dpaLetterDate            DateTime?
  dpaSigningPartner        String?
  // ... other DPA fields
}
```

## AI Prompt Engineering

### Engagement Letter Analysis

The AI is prompted to extract:

1. **Letter Date:** Look for dates near heading or signature section
2. **Signing Partner:** Partner name near signature, may use "pp" notation
3. **Services Covered:** Tax, audit, advisory, accounting keywords
4. **Signatures:** Keywords like "signed", "acknowledged", "pp", partner/client names
5. **Terms & Conditions:** Separate section with own signatures

### DPA Analysis

Simplified version focusing on:
1. **DPA Date:** Date near heading or signature
2. **Signing Partner:** Representative name
3. **Signatures:** Partner/firm and client signatures

## Signature Detection

**Keywords and Patterns:**

Partner Signature:
- "signed", "signature", "pp", "for and on behalf of"
- Partner name followed by title
- "For Forvis Mazars"

Client Signature:
- "acknowledged", "accepted", "agreed"
- "on behalf of [Client Name]"
- "Client signature"

## Troubleshooting

### Common Issues

**Issue: "Insufficient text extracted"**
- **Cause:** PDF is image-based (scanned document)
- **Solution:** Re-save as searchable PDF or use OCR

**Issue: "Signatures not detected"**
- **Cause:** Unusual signature formatting or placement
- **Solution:** Ensure clear signature lines with labels

**Issue: "Date not found"**
- **Cause:** Date in unusual format or location
- **Solution:** Place date prominently near heading

**Issue: "Partner name not identified"**
- **Cause:** Name not near signature or unusual format
- **Solution:** Use clear "Signed by: [Name], Partner" format

### Performance Issues

**Slow Processing (>30 seconds):**
- Large PDF files (>5MB)
- Complex multi-page documents
- Azure service under load

**Mitigation:**
- Keep PDFs under 5MB
- Use single-page signature pages when possible
- Retry if timeout occurs

### Extraction Failures

When extraction fails, the system:
1. Saves error to database (`elExtractionError`)
2. Returns detailed error message to user
3. Does NOT upload document to blob storage
4. Logs error for debugging

## Best Practices

### For Partners Uploading Documents

1. **Use searchable PDFs** (not scanned images)
2. **Clear signature sections** with labels
3. **Include date** prominently at top or near signatures
4. **Terms & Conditions** as separate section with own signatures
5. **Keep file size** under 5MB
6. **Test upload** before sending to client if possible

### For Developers

1. **Monitor extraction success rate** via logs
2. **Update prompts** based on real-world failures
3. **Handle timeouts gracefully** (60s limit)
4. **Log extraction metadata** for debugging
5. **Test with various PDF formats** during development

## Security Considerations

### Data Privacy

- Extracted text stored temporarily (optional field)
- Can be excluded in production for sensitive data
- Only Partners/Admins can upload documents
- Access controlled by existing authorization

### Validation Bypass

- No way to bypass signature validation
- Extraction errors logged for audit
- Failed uploads do not reach blob storage

### API Security

- Authentication required (Partners/Admins only)
- Rate limiting applied
- File size limit enforced (10MB)
- PDF-only validation

## Environment Variables

```bash
# Azure Document Intelligence (required)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

# Azure OpenAI (required)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-5-nano
```

## Monitoring & Metrics

### Key Metrics to Track

- **Extraction Success Rate:** % of successful extractions
- **Average Processing Time:** Document Intelligence + AI analysis
- **Validation Failure Reasons:** Most common validation errors
- **Partner Match Rate:** % of partner names successfully matched

### Logging

All operations logged with structured data:

```typescript
logger.info('Engagement letter extraction completed', {
  taskId,
  isValid: true,
  processingTime: 12500,
  letterAge: 30,
});
```

## Testing

### Unit Tests

Run tests with:
```bash
npm test src/lib/services/documents/__tests__/
```

Tests cover:
- Successful extraction with valid documents
- Validation failures (missing signatures, dates, etc.)
- Partner code matching
- Date age calculations
- Error handling

### Manual Testing Checklist

- [ ] Upload valid engagement letter PDF
- [ ] Upload PDF missing partner signature
- [ ] Upload PDF missing client signature
- [ ] Upload PDF with no T&C section
- [ ] Upload PDF with invalid date
- [ ] Upload non-PDF file (should reject)
- [ ] Upload very old document (>5 years)
- [ ] Upload future-dated document
- [ ] Verify extracted data displays correctly
- [ ] Verify error messages are clear

## Future Enhancements

### Planned Improvements

1. **Custom AI Models:** Train Form Recognizer on sample engagement letters
2. **Confidence Scoring:** Display AI confidence levels to users
3. **Manual Override:** Allow Partners to override validation
4. **Service Matching:** Match extracted services to ServiceLineMaster
5. **Partner Validation:** Flag when extracted partner ≠ task partner
6. **Version Tracking:** Store extraction history on document replacement
7. **Bulk Upload:** Process multiple documents in batch

### Feature Requests

Submit feature requests or report issues via GitHub or to the development team.

## Support

For technical support or questions:
- Review this documentation
- Check logs for detailed error messages
- Contact development team with task ID and error details

## Changelog

### Version 1.0 (2026-01-12)
- Initial release
- Engagement letter extraction
- DPA extraction
- Signature validation
- AI-powered metadata extraction
- UI display of extracted data
