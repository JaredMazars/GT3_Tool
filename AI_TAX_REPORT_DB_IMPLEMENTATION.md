# AI Tax Report Database Implementation

## Overview
Updated the AI Tax Report feature to save reports to the database and allow users to select them for PDF export via checkbox.

## Changes Made

### 1. Database Schema (prisma/schema.prisma)
- Added `AITaxReport` model to store generated reports:
  ```prisma
  model AITaxReport {
    id                Int      @id @default(autoincrement())
    projectId         Int
    executiveSummary  String
    risks             String   // JSON array of risk objects
    taxSensitiveItems String   // JSON array of tax-sensitive item objects
    detailedFindings  String
    recommendations   String   // JSON array of recommendation strings
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
    project           Project  @relation(fields: [projectId], references: [id])
    
    @@index([projectId])
  }
  ```
- Added relation to `Project` model
- Created migration: `20251009123903_add_ai_tax_report`

### 2. API Endpoint (src/app/api/projects/[id]/ai-tax-report/route.ts)
- **Added GET endpoint**: Fetches the most recent AI tax report for a project
  - Returns 404 if no report exists
  - Parses JSON fields (risks, taxSensitiveItems, recommendations) before returning
  
- **Updated POST endpoint**: Saves generated report to database
  - Generates report using AI
  - Stores in database with JSON stringified arrays
  - Returns report with database ID

### 3. AI Tax Report Component (src/components/reports/AITaxReport.tsx)
- **Added `onReportLoaded` callback**: Notifies parent component when report is loaded
- **Added `fetchExistingReport` function**: Fetches saved report on component mount
- **Added useEffect hooks**:
  - Fetches existing report when component mounts
  - Notifies parent when report changes

### 4. Reporting Page (src/app/dashboard/projects/[id]/reporting/page.tsx)
- **Added AI Report checkbox**: 
  - Displays next to other report checkboxes
  - Disabled if no report has been generated
  - Shows "(Generate first)" hint when disabled
  
- **Added `handleAIReportLoaded` callback**: Receives report data from component
  
- **Updated `handleSelectAll`**: Includes AI report checkbox if report exists
  
- **Updated `handleDeselectAll`**: Includes AI report checkbox
  
- **Updated `handleExportPDF`**: 
  - Removed automatic AI report generation
  - Uses checkbox selection to determine if AI report should be included
  - Only includes AI report if checkbox is checked and report data exists

## User Workflow

### Generating an AI Tax Report:
1. Navigate to Reporting tab
2. Click on "AI Tax Report" tab
3. Click "Generate AI Tax Report" button
4. Wait 30-60 seconds for generation
5. Report is saved to database and displayed
6. Checkbox becomes enabled for PDF export

### Exporting with AI Report:
1. Ensure AI tax report has been generated
2. Check the "AI Tax Report" checkbox in the PDF export options
3. Click "Export to PDF"
4. PDF will include the AI tax report section

### Regenerating Report:
1. Click "Regenerate Report" button in the AI Tax Report tab
2. A new report is generated and saved to database
3. Latest report is automatically used for PDF export

## Technical Notes

- Reports are stored per project (one-to-many relationship)
- Only the most recent report is retrieved and used for PDF export
- Old reports are kept in database for historical reference
- JSON arrays are stringified for SQLite TEXT storage
- No automatic cleanup of old reports (could be added later)
- Report generation takes 30-60 seconds using GPT-4o-mini
- Estimated cost: $0.01-0.03 per report generation

## Database Schema
The AITaxReport table stores:
- `executiveSummary`: Plain text executive summary
- `risks`: JSON array of risk objects with severity, title, description, recommendation
- `taxSensitiveItems`: JSON array of items requiring attention
- `detailedFindings`: Plain text detailed analysis
- `recommendations`: JSON array of recommendation strings
- `createdAt`: Timestamp of report generation
- `updatedAt`: Timestamp of last update

## Benefits of Database Storage

1. **Persistence**: Reports survive page refreshes and session changes
2. **Performance**: No need to regenerate for PDF export
3. **History**: Can track report changes over time
4. **Cost Savings**: Avoid redundant API calls to OpenAI
5. **Audit Trail**: Know when reports were generated
6. **User Control**: Explicit selection of reports for export







