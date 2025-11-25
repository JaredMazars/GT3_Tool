# Analytics Module - Code Review Report
**Date:** November 25, 2025
**Reviewed By:** AI Code Review
**Modules:** Analytics (Documents, Credit Ratings, Financial Ratios)

---

## Executive Summary

The analytics module has been reviewed for **type safety**, **security**, **performance**, and **best practices compliance**. A total of **13 issues** were identified across critical, high, and medium priority levels.

### Priority Breakdown
- 🔴 **Critical Issues:** 4 (Security & Type Safety)
- 🟡 **High Priority:** 4 (Validation & Performance)
- 🟢 **Medium Priority:** 5 (Code Quality & Best Practices)

---

## 🔴 CRITICAL ISSUES

### 1. Missing Authorization Checks (SECURITY - CRITICAL)
**Severity:** Critical
**Files:** All API routes (`documents/route.ts`, `rating/route.ts`, `rating/[ratingId]/route.ts`)

**Issue:**
API routes verify authentication but do NOT verify authorization. Any logged-in user can access or modify any client's analytics data by changing the client ID in the URL.

**Location:**
```typescript
// Current Implementation - INSECURE
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const { id } = await context.params;
const clientId = parseInt(id);

// NO CHECK: Does user have access to this client?
```

**Risk:**
- Data breach: Users can view sensitive financial data of any client
- Unauthorized modifications: Users can generate/delete ratings for clients they don't have access to
- Compliance violations: POPIA/GDPR violations for unauthorized access to financial data

**Recommended Fix:**
```typescript
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const { id } = await context.params;
const clientId = parseInt(id);

// ADD AUTHORIZATION CHECK
const hasAccess = await checkClientAccess(user.id, clientId);
if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Action Required:**
1. Create `checkClientAccess()` function in `@/lib/services/auth/auth`
2. Add authorization check to ALL analytics API routes
3. Add audit logging for access attempts

---

### 2. Path Traversal & File Upload Vulnerabilities (SECURITY - CRITICAL)
**Severity:** Critical
**Files:** `documents/route.ts`

**Issue:**
While filename is sanitized, there are multiple security gaps:
1. No MIME type validation against file extension
2. No magic number verification (file signature check)
3. No virus/malware scanning
4. Potential for executable file uploads

**Location:**
```typescript
// Current Implementation - INCOMPLETE SECURITY
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `${timestamp}_${sanitizedFileName}`;
const filePath = path.join(uploadDir, fileName);
await fs.writeFile(filePath, buffer);
```

**Risk:**
- Malicious file uploads (executables disguised as PDFs)
- Server compromise via file execution
- Storage of malware that could spread to other systems

**Recommended Fix:**
```typescript
import { fileTypeFromBuffer } from 'file-type';

// Validate MIME type
const allowedMimeTypes = ['application/pdf', 'application/vnd.ms-excel', ...];
if (!allowedMimeTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}

// Verify file signature (magic numbers)
const fileType = await fileTypeFromBuffer(buffer);
if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
  throw new Error('File type mismatch or invalid file');
}

// Sanitize filename - remove extension and add controlled one
const safeBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_');
const extension = fileType.ext;
const fileName = `${timestamp}_${safeBaseName}.${extension}`;
```

**Action Required:**
1. Install `file-type` package for magic number validation
2. Add strict MIME type validation
3. Implement virus scanning (ClamAV or cloud-based)
4. Store files outside web root
5. Implement file quarantine for uploaded files

---

### 3. SQL Injection via Unsafe Date Construction (SECURITY - CRITICAL)
**Severity:** Critical
**Files:** `rating/route.ts`

**Issue:**
Unsanitized date parameters from query string are passed directly to `new Date()` without validation, then used in database queries.

**Location:**
```typescript
const startDate = searchParams.get('startDate');
const endDate = searchParams.get('endDate');

const where: any = { clientId }; // Using 'any' type
if (startDate || endDate) {
  where.ratingDate = {};
  if (startDate) where.ratingDate.gte = new Date(startDate); // UNSAFE
  if (endDate) where.ratingDate.lte = new Date(endDate);     // UNSAFE
}
```

**Risk:**
- Invalid date strings cause runtime errors
- Potential for NoSQL injection via malformed queries
- Type coercion vulnerabilities
- Denial of Service via malformed input

**Recommended Fix:**
```typescript
// Add Zod schema for query parameters
const QueryParamsSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Validate
const params = QueryParamsSchema.safeParse({
  limit: searchParams.get('limit'),
  startDate: searchParams.get('startDate'),
  endDate: searchParams.get('endDate'),
});

if (!params.success) {
  return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
}

// Type-safe where clause
const where: Prisma.ClientCreditRatingWhereInput = { clientId };
if (params.data.startDate || params.data.endDate) {
  where.ratingDate = {
    ...(params.data.startDate && { gte: new Date(params.data.startDate) }),
    ...(params.data.endDate && { lte: new Date(params.data.endDate) }),
  };
}
```

**Action Required:**
1. Create Zod validation schemas for ALL query parameters
2. Replace `any` types with proper Prisma types
3. Add error handling for date parsing

---

### 4. Unsafe Type Assertions & JSON Parsing (TYPE SAFETY - CRITICAL)
**Severity:** Critical
**Files:** `creditRatingAnalyzer.ts`, all rating routes

**Issue:**
Multiple instances of unsafe type casting and unvalidated JSON parsing that could cause runtime errors or security issues.

**Locations:**
```typescript
// Issue 1: Unsafe type assertion in AI response
return object as unknown as CreditAnalysisReport;

// Issue 2: Unvalidated JSON parsing from database
analysisReport: JSON.parse(rating.analysisReport),
financialRatios: JSON.parse(rating.financialRatios),

// Issue 3: Any type for extracted data
const parsed = typeof doc.extractedData === 'string' 
  ? JSON.parse(doc.extractedData) 
  : doc.extractedData;
```

**Risk:**
- Runtime crashes from corrupted database data
- Type mismatches leading to incorrect calculations
- Security vulnerabilities from malformed data
- Silent failures in production

**Recommended Fix:**
```typescript
// Create Zod schemas for runtime validation
const CreditAnalysisReportSchema = z.object({
  executiveSummary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    impact: z.string(),
    mitigation: z.string().optional(),
  })),
  industryComparison: z.object({
    industry: z.string(),
    companyPosition: z.string(),
    keyMetrics: z.array(z.object({
      metric: z.string(),
      companyValue: z.number(),
      industryAverage: z.number(),
      comparison: z.string(),
    })),
  }).optional(),
  recommendations: z.array(z.string()),
  detailedAnalysis: z.string(),
});

// Use for AI response validation
const validatedReport = CreditAnalysisReportSchema.parse(object);

// Use for database parsing with error handling
function parseAnalysisReport(json: string): CreditAnalysisReport {
  try {
    const parsed = JSON.parse(json);
    return CreditAnalysisReportSchema.parse(parsed);
  } catch (error) {
    logger.error('Failed to parse analysis report', { error, json });
    throw new AppError(500, 'Invalid analysis report data', ErrorCodes.VALIDATION_ERROR);
  }
}
```

**Action Required:**
1. Create Zod schemas for ALL database JSON fields
2. Remove `as unknown as` type assertions
3. Add try-catch around all JSON.parse calls
4. Validate AI responses before using

---

## 🟡 HIGH PRIORITY ISSUES

### 5. Missing Input Validation with Zod (VALIDATION - HIGH)
**Severity:** High
**Files:** All POST/PUT routes

**Issue:**
Request bodies are not validated with Zod schemas as per project conventions.

**Current:**
```typescript
const body = await request.json();
const { documentIds } = body;

if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
  return NextResponse.json({ error: 'At least one document ID is required' }, { status: 400 });
}
```

**Should Be:**
```typescript
import { GenerateCreditRatingSchema } from '@/lib/validation/schemas';

const body = await request.json();
const validated = GenerateCreditRatingSchema.parse(body);
```

**Action Required:**
1. Add schemas to `@/lib/validation/schemas.ts`
2. Use Zod validation in ALL API routes

---

### 6. N+1 Query Problem & Missing Pagination (PERFORMANCE - HIGH)
**Severity:** High
**Files:** `rating/route.ts`

**Issue:**
Nested includes cause multiple database queries. No cursor-based pagination for large datasets.

**Current:**
```typescript
const ratings = await prisma.clientCreditRating.findMany({
  where,
  orderBy: { ratingDate: 'desc' },
  take: limit, // Only limit, no cursor
  include: {
    Documents: {
      include: {
        AnalyticsDocument: true, // N+1 potential
      },
    },
  },
});
```

**Recommended:**
```typescript
// Option 1: Use select instead of include where possible
const ratings = await prisma.clientCreditRating.findMany({
  where,
  orderBy: { ratingDate: 'desc' },
  take: limit,
  cursor: cursor ? { id: cursor } : undefined,
  select: {
    id: true,
    clientId: true,
    ratingScore: true,
    // ... specific fields
    Documents: {
      select: {
        AnalyticsDocument: {
          select: {
            id: true,
            fileName: true,
            // ... specific fields
          }
        }
      }
    }
  },
});

// Option 2: Use dataloader pattern for batching
```

**Action Required:**
1. Implement cursor-based pagination
2. Use select for specific fields
3. Add database indexes
4. Consider implementing DataLoader

---

### 7. Non-Atomic Database Operations (DATA INTEGRITY - HIGH)
**Severity:** High
**Files:** `rating/route.ts`

**Issue:**
Creating credit rating and document associations in separate operations can lead to orphaned records.

**Current:**
```typescript
const rating = await prisma.clientCreditRating.create({ ... });

// Separate operation - if this fails, rating is orphaned
await prisma.creditRatingDocument.createMany({ ... });
```

**Recommended:**
```typescript
const rating = await prisma.$transaction(async (tx) => {
  const rating = await tx.clientCreditRating.create({
    data: {
      clientId,
      ratingScore: result.ratingScore,
      // ...
    },
  });

  await tx.creditRatingDocument.createMany({
    data: documentIds.map((docId: number) => ({
      creditRatingId: rating.id,
      analyticsDocumentId: docId,
    })),
  });

  return rating;
});
```

**Action Required:**
1. Wrap rating creation in transaction
2. Add transaction to document upload if needed
3. Add rollback error handling

---

### 8. Memory Pressure from Large File Uploads (PERFORMANCE - HIGH)
**Severity:** High
**Files:** `documents/route.ts`

**Issue:**
Files up to 10MB are loaded entirely into memory before writing. Concurrent uploads could cause OOM.

**Current:**
```typescript
const buffer = Buffer.from(await file.arrayBuffer());
// ... later
await fs.writeFile(filePath, buffer);
```

**Recommended:**
```typescript
// Use streams for large files
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const stream = Readable.from(file.stream());
const writeStream = fs.createWriteStream(filePath);
await pipeline(stream, writeStream);
```

**Action Required:**
1. Implement streaming file upload
2. Add memory monitoring
3. Consider using blob storage (Azure Storage)

---

## 🟢 MEDIUM PRIORITY ISSUES

### 9. Missing Rate Limiting (SECURITY - MEDIUM)
**Severity:** Medium
**Files:** All API routes, especially `rating/route.ts` (POST)

**Issue:**
No rate limiting on expensive AI operations. Users could spam credit rating generation.

**Recommended:**
```typescript
import { rateLimit } from '@/lib/api/rateLimit';

export const POST = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many rating generation requests, please try again later'
})(async (request, context) => {
  // ... handler
});
```

**Action Required:**
1. Implement rate limiting middleware
2. Add different limits for different operations
3. Add user-based tracking

---

### 10. Inconsistent Null Handling (TYPE SAFETY - MEDIUM)
**Severity:** Medium
**Files:** `CreditRatingsTab.tsx`

**Issue:**
Optional chaining and null coalescing used inconsistently, potential for undefined access.

**Action Required:**
1. Add null checks before calculations
2. Use optional chaining consistently
3. Add TypeScript strict null checks verification

---

### 11. Weak Confidence Calculation (LOGIC - MEDIUM)
**Severity:** Medium
**Files:** `creditRatingAnalyzer.ts`

**Issue:**
Confidence score based only on data point count, not data quality or validation results.

**Recommended Enhancement:**
```typescript
// Factor in data quality
let confidence = 0.5;
const qualityFactors = {
  dataCompleteness: totalCount / 10,
  dataRecency: calculateRecency(documents),
  dataConsistency: validateDataConsistency(ratios),
  aiConfidence: analysisConfidence,
};

confidence = Object.values(qualityFactors).reduce((sum, val) => sum + val, 0) / 4;
```

---

### 12. Missing Audit Logging (COMPLIANCE - MEDIUM)
**Severity:** Medium
**Files:** All API routes

**Issue:**
Insufficient audit logging for financial data access and modifications.

**Recommended:**
```typescript
await auditLog.create({
  userId: user.id,
  action: 'CREDIT_RATING_GENERATED',
  resourceType: 'CreditRating',
  resourceId: rating.id,
  metadata: {
    clientId,
    documentCount: documents.length,
    ratingGrade: result.ratingGrade,
  },
});
```

**Action Required:**
1. Add audit logging to all mutations
2. Log access to sensitive data
3. Include IP address and user agent

---

### 13. Error Messages Leak Implementation Details (SECURITY - MEDIUM)
**Severity:** Medium
**Files:** Multiple

**Issue:**
Error messages sometimes expose internal details that could aid attackers.

**Example:**
```typescript
error: `Some document IDs are invalid`,
found: documents.length,
requested: documentIds.length,
```

**Recommended:**
Generic error messages in production, detailed logging server-side.

---

## Immediate Action Items (Priority Order)

1. **[CRITICAL]** Add authorization checks to all analytics API routes
2. **[CRITICAL]** Implement file upload security (MIME validation, magic numbers)
3. **[CRITICAL]** Add Zod validation for all query parameters and dates
4. **[CRITICAL]** Create Zod schemas for JSON database fields and validate on parse
5. **[HIGH]** Add Zod schemas to validation file and use in all POST routes
6. **[HIGH]** Implement transactions for rating creation
7. **[HIGH]** Add cursor-based pagination
8. **[HIGH]** Implement streaming file uploads
9. **[MEDIUM]** Add rate limiting to expensive operations
10. **[MEDIUM]** Add comprehensive audit logging

---

## Code Quality Metrics

- **Type Safety Score:** 6/10 (Multiple `any` types, unsafe assertions)
- **Security Score:** 4/10 (Missing authorization, file upload issues)
- **Performance Score:** 6/10 (N+1 queries, memory issues)
- **Error Handling Score:** 7/10 (Good try-catch coverage, needs validation)
- **Test Coverage:** Not evaluated (no test files provided)

---

## Recommended Next Steps

1. Create Zod validation schemas file
2. Implement authorization service
3. Add comprehensive unit tests
4. Set up integration tests for API routes
5. Implement security scanning in CI/CD
6. Add performance monitoring
7. Create security incident response plan

---

*End of Report*



