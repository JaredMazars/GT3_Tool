# Route Review Standards

**Version**: 2.0  
**Last Updated**: January 21, 2026

This document defines the comprehensive review standards for all API routes in the application. These checklists should be applied systematically to every route during review.

---

## Table of Contents

1. [Security Review Checklist](#security-review-checklist)
2. [Performance Review Checklist](#performance-review-checklist)
3. [Correctness & Observability Checklist](#correctness--observability-checklist)
4. [Data Integrity Checklist](#data-integrity-checklist)
5. [Resilience Checklist](#resilience-checklist)

---

## Security Review Checklist

For each route, verify:

### Authentication & Authorization

- [ ] Uses `secureRoute` wrapper (not raw handler)
- [ ] Uses the correct `secureRoute` method (`query`, `queryWithParams`, `mutation`, `ai`, `fileUpload`)
- [ ] Appropriate `feature` permission is set (if applicable)
- [ ] Rate limiting is configured for mutations (POST/PUT/PATCH/DELETE)
- [ ] Task access checks for task-specific routes (`checkTaskAccess`)
- [ ] Service line access checks where needed
- [ ] Service line context passed to feature checks where applicable (via `serviceLine` option)
- [ ] **IDOR protection** - User can only access resources they own/have permission for
- [ ] **Business logic authorization** - Beyond role checks (e.g., can't approve own submissions)

### Input Validation & Sanitization

- [ ] Input validation via Zod schema for request body
- [ ] Route params + querystring are validated (Zod / `parseXxxId()` utilities), not just body
- [ ] **Branded ID type usage** - All route params use `parseXxxId()` utilities per workspace rules
- [ ] `sanitizeObject()` applied to user input (automatic in secureRoute mutations)
- [ ] No manual `sanitizeText()` calls in mutation handlers (automatic via `sanitizeObject()` in secureRoute)
- [ ] User-controlled sorting/filtering uses an allowlist (no raw field passthrough)
- [ ] List endpoints enforce safe limits (max `take`/page size; validate cursor/skip)
- [ ] **Mass assignment protection** - No spreading user input directly into Prisma `data`
- [ ] **No `any` types** - Use `unknown` or proper interfaces per workspace rules
- [ ] **SQL Server case sensitivity** - NEVER use `mode: 'insensitive'` (not supported by SQL Server)
  - SQL Server uses collation-based case sensitivity (default: `SQL_Latin1_General_CP1_CI_AS` is case-insensitive)
  - Use `contains`, `startsWith`, `endsWith` without mode parameter for case-insensitive searches
  - **Wrong**: `where: { name: { contains: query, mode: 'insensitive' } }`
  - **Correct**: `where: { name: { contains: query } }`

### Data Protection

- [ ] No sensitive data in error messages
- [ ] `Cache-Control` headers are appropriate (sensitive/user-specific responses are `no-store`)
- [ ] Prisma queries use explicit `select:` fields (no `select *`)
- [ ] **Soft-deleted record exclusion** - Queries filter out soft-deleted records where applicable
- [ ] **Raw SQL safety** - If `prisma.$queryRaw` used, verify parameterization

### Logging & Audit

- [ ] No `console.log` - uses `logger` instead
- [ ] Audit logging for sensitive operations
- [ ] Logs/audit logs avoid secrets/PII and include minimal context (userId, resourceId)

### File & External Operations

- [ ] File uploads (if any) validate size + MIME/type allowlist; storage paths are not user-controlled
- [ ] **Blob storage containers** - Each document type uses purpose-specific container (never mix types)
  - Container naming: `{purpose}` or `{purpose}-{category}` (e.g., `engagement-letters`, `dpa`, `acceptance-documents`)
  - Path structure: `{entityId}/{timestamp}_{sanitized_filename}`
  - Create dedicated container client function per document type
  - Never store different document types in same container
  - See `.cursor/rules/blob-storage-rules.mdc` for complete requirements
  
  ```typescript
  // Example: Dedicated container for engagement letters
  const containerClient = blobServiceClient.getContainerClient('engagement-letters');
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobName = `${taskId}/${timestamp}_${sanitizedName}`;
  await containerClient.getBlockBlobClient(blobName).upload(buffer);
  ```
- [ ] Outbound calls (if any) use allowlisted hosts + timeouts (SSRF + hanging request protection)
- [ ] **Response header hardening** - `X-Content-Type-Options: nosniff` for file downloads

### Code Quality & Import Consistency

- [ ] Correct import paths for core utilities:
  - `AppError`, `handleApiError`, `ErrorCodes` from `@/lib/utils/errorHandler`
  - `logger` from `@/lib/utils/logger`
  - `parseXxxId()` utilities from `@/lib/utils/apiUtils`
  - `secureRoute`, `Feature` from `@/lib/api/secureRoute`
  - `successResponse` from `@/lib/utils/apiUtils`
- [ ] No stale imports (paths that no longer exist cause build failures)
- [ ] Routes with params use `*WithParams` variants (not base variants with manual param parsing)

---

## Performance Review Checklist

For each route, verify:

### Database Optimization

- [ ] Database queries are optimized (no N+1 queries)
- [ ] List endpoints use deterministic ordering for pagination (cursor or stable `orderBy`)
- [ ] Minimal data selection (only required fields)
- [ ] Default limits are applied (no unbounded `findMany()` on large tables)
- [ ] Indexes exist for frequently queried fields
- [ ] **Verify indexes are used** - Critical queries should use indexes (check with EXPLAIN)
- [ ] **Query complexity limits** - Complex filters/sorts have bounded depth

### Caching

- [ ] Appropriate caching strategy (Redis/in-memory)
- [ ] Cache invalidation on mutations

### Request Handling

- [ ] Pagination for list endpoints
- [ ] Batch operations use `Promise.all()` where independent
- [ ] No unnecessary database calls
- [ ] Large payloads are paginated or streamed
- [ ] No blocking operations in hot paths
- [ ] External/API calls (if any) are parallelized and use timeouts to avoid slow requests
- [ ] **No dynamic imports in handlers** - Static imports only per workspace rules (except AI/ML)
- [ ] **Response size limits** - Large JSON responses are bounded or streamed

### Concurrency & Connection Management

- [ ] **Race condition prevention** - Concurrent mutations use optimistic locking or transactions
- [ ] **Connection pool health** - Prisma connection limit not exceeded under load

---

## Correctness & Observability Checklist

For each route, verify:

### Response Handling

- [ ] Uses appropriate HTTP status codes (e.g., 200/201/204) and consistent response wrappers (`successResponse` / errors)
- [ ] Errors use stable app error codes (no raw stack traces returned; no ad-hoc `{ error }` responses)
- [ ] **Error categorization** - 4xx for client errors (validation, auth), 5xx for server errors
- [ ] **Response shape validation** - Response matches expected DTO type

### Data Consistency

- [ ] Multi-step mutations use a Prisma transaction (`prisma.$transaction`) to avoid partial writes
- [ ] **Idempotency for critical mutations** - Retrying POST/PUT doesn't create duplicates
- [ ] **Null vs undefined consistency** - Per workspace rules: `undefined` for optional, `null` for DB nulls
- [ ] **Decimal precision for financial data** - Use Decimal.js or similar, never floats for money
- [ ] **Timezone handling** - Dates stored/returned in UTC, converted on frontend
- [ ] **Fiscal period filtering** (Financial routes only) - Routes filtering financial tables by date MUST use fiscal period helpers
  - Applies to: WIPTransactions, DrsTransactions, Wip, Debtors, WIPAging tables
  - Never manually calculate fiscal periods
  - Fiscal year: September to August (FY2024 = Sep 2023 - Aug 2024)
  - Use `buildFiscalPeriodFilter()` for queries, `getFiscalPeriods()` for dropdowns
  - If using raw SQL, use `dbo.GetFiscalYear()`, `dbo.GetFiscalQuarter()`, etc.
  
  ```typescript
  import { buildFiscalPeriodFilter } from '@/lib/services/reports/fiscalPeriodQueries';
  
  const where = buildFiscalPeriodFilter(
    { fiscalYear: 2024, fiscalQuarter: 2 },
    'TranDate' // date field name
  );
  const transactions = await prisma.wIPTransactions.findMany({ where });
  ```

### Observability

- [ ] Runtime is appropriate (Prisma/Node APIs run in Node.js, not Edge)
- [ ] Monitoring/logging includes enough context to debug (route, userId, resource ids) without logging secrets/PII
- [ ] **Correlation ID propagation** - Request ID in logs for distributed tracing

---

## Data Integrity Checklist

For routes that create, update, or delete data:

- [ ] Foreign key relationships are validated (referenced records exist before insert/update)
- [ ] Cascade deletes are intentional and documented
- [ ] Unique constraints are validated before insert (prevents race condition errors)
- [ ] Orphaned records are prevented (e.g., deleting parent doesn't orphan children without cleanup)
- [ ] **Data model relationships validated** - Task→Client and Client→Group boundaries enforced
  - **Task-to-Client**: Verify task belongs to specified client before operations
  - **Client-to-Group**: Verify client belongs to specified group before operations
  - **Critical for APIs** working across clients/groups or with cross-entity parameters
  
  ```typescript
  // Example: Validate task belongs to client
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { GSClientID: true }
  });
  if (task?.GSClientID !== clientId) {
    throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
  }
  
  // Example: Validate client belongs to group
  const client = await prisma.client.findUnique({
    where: { GSClientID: clientId },
    select: { groupCode: true }
  });
  if (client?.groupCode !== groupCode) {
    throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
  }
  ```
- [ ] **Approval system integration** (For approval workflows only) - Use centralized approval service
  - **Applies to**: Client acceptance, engagement letters, DPA, change requests, review notes, continuance
  - MUST use `approvalService.createApproval()`, not custom approval logic
  - Workflow type MUST be registered in `workflowRegistry.ts`
  - MUST call `invalidateApprovalsCache()` after approval mutations
  - Workflow entity must link back to approval (e.g., `approvalId` field)
  - Never create separate approval tables per workflow
  
  ```typescript
  import { approvalService } from '@/lib/services/approvals/approvalService';
  import { invalidateApprovalsCache } from '@/lib/services/cache/cacheInvalidation';
  
  // Create approval when workflow needs approval
  const approval = await approvalService.createApproval({
    workflowType: 'CHANGE_REQUEST',
    workflowId: item.id,
    title: 'Descriptive title',
    requestedById: user.id,
    context: { /* routing data */ }
  });
  
  // Link back to workflow
  await prisma.yourTable.update({
    where: { id: item.id },
    data: { approvalId: approval.id }
  });
  
  // CRITICAL: Invalidate cache
  await invalidateApprovalsCache();
  ```
- [ ] Audit trail for sensitive data changes (who changed what, when)

---

## Resilience Checklist

For routes that call external APIs or services:

- [ ] Circuit breaker pattern for external API failures
- [ ] Retry logic with exponential backoff + jitter
- [ ] Graceful degradation when dependencies unavailable
- [ ] Fallback values or cached responses for non-critical data
- [ ] Timeout configuration to prevent hanging requests
- [ ] Dead letter handling for failed async operations (if applicable)

---

## AI-Specific Checklist

For routes using Azure OpenAI or AI-powered features:

### AI Configuration & Imports

- [ ] **Model imports** - Import models from `@/lib/ai/config`, not direct Azure SDK
  - Use `models.mini` (GPT-5 Mini for general tasks)
  - Use `models.nano` (lightweight for extraction/simple tasks)
  - Use `models.embedding` (for RAG/semantic search)
  - Use `getModelParams()` for reasoning models (handles unsupported parameters)
  
  ```typescript
  import { models, getModelParams } from '@/lib/ai/config';
  import { generateText, generateObject } from 'ai';
  
  const result = await generateText({
    model: models.mini,
    prompt: 'Your prompt',
    ...getModelParams({ temperature: 0.7 })
  });
  ```

### Security & Rate Limiting

- [ ] **Strict rate limiting** - AI endpoints use `secureRoute.ai()` or `secureRoute.aiWithParams()`
  - Automatically enforces stricter rate limits than regular mutations
  - Prevents AI API cost abuse and resource exhaustion
  
  ```typescript
  export const POST = secureRoute.aiWithParams({
    taskIdParam: 'id',
    schema: GenerateReportSchema,
    handler: async (request, { user, params, data }) => {
      // AI rate limiting automatically enforced
    },
  });
  ```

- [ ] **Prompt injection prevention** - User input in prompts is sanitized and validated
  - Use Zod schema for structured inputs
  - Sanitize before including in prompts
  - Never pass raw user input directly to AI

### Error Handling & Resilience

- [ ] **AI failure fallback** - Route has graceful degradation when AI service unavailable
  - Return cached/default response
  - Provide manual fallback option
  - Don't block critical workflows on AI failures
  
- [ ] **Timeout configuration** - AI calls have reasonable timeouts (30-60s max)
- [ ] **Token/cost limits** - Expensive operations have token or cost limits
- [ ] **Retry strategy** - Transient failures (429, 503) retry with exponential backoff
- [ ] **Error context** - AI errors logged with sufficient context (prompt summary, model, parameters) but no PII

### RAG Integration (If Applicable)

- [ ] **RAG availability check** - If using RAG, verify `RAGEngine.isConfigured()` before use
- [ ] **Scope isolation** - RAG searches scoped to appropriate context (taskId, clientId)
- [ ] **Source citation** - AI responses include source documents for auditability
- [ ] **Index management** - Document indexing handled properly (chunking, embeddings)

### Structured Output Validation

- [ ] **Zod schema validation** - `generateObject()` calls use Zod schema for type safety
- [ ] **Fallback validation** - Manual validation as fallback if AI returns invalid structure
- [ ] **Schema versioning** - Breaking schema changes handled gracefully

**See**: `.cursor/rules/ai-patterns.mdc` for complete AI implementation patterns

---

## Common Patterns & Solutions

### Pattern: secureRoute Migration

**Before** (Legacy):
```typescript
export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) throw new AppError(401, 'Unauthorized');
  // ... handler logic
}
```

**After** (Correct):
```typescript
import { secureRoute, Feature } from '@/lib/api/secureRoute';

export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user }) => {
    // ... handler logic
    return NextResponse.json(successResponse(data));
  },
});
```

### Pattern: Explicit Select Fields

**Before** (Bad):
```typescript
const tasks = await prisma.task.findMany({
  where: { GSClientID: clientId }
});
```

**After** (Correct):
```typescript
const tasks = await prisma.task.findMany({
  where: { GSClientID: clientId },
  select: {
    id: true,
    taskCode: true,
    description: true,
    stage: true,
    updatedAt: true,
  }
});
```

### Pattern: Take Limits on List Endpoints

**Before** (Bad):
```typescript
const clients = await prisma.client.findMany();
```

**After** (Correct):
```typescript
const clients = await prisma.client.findMany({
  take: 100,
  orderBy: [{ clientName: 'asc' }, { clientCode: 'asc' }]
});
```

### Pattern: Branded ID Parsing

**Before** (Bad):
```typescript
const taskId = parseInt(params.id);
if (isNaN(taskId)) throw new AppError(400, 'Invalid ID');
```

**After** (Correct):
```typescript
import { parseTaskId } from '@/lib/utils/apiUtils';

const taskId = parseTaskId(params.id);
```

### Pattern: Cache Invalidation After Mutations

**Required**:
```typescript
import { invalidateApprovalsCache, invalidateWorkspaceCounts } from '@/lib/services/cache/cacheInvalidation';

// After creating/updating task
await invalidateWorkspaceCounts(serviceLine, subServiceLineGroup);

// After approval mutations
await invalidateApprovalsCache();
```

---

## Review Best Practices

### For Individual Routes

1. **Read the entire route handler** before starting checklist
2. **Check imports first** - Verify all import paths are correct
3. **Trace data flow** - Request → Validation → Database → Response
4. **Look for edge cases** - What happens on empty results, invalid IDs, concurrent requests?
5. **Verify error paths** - Do error messages leak sensitive data?

### For Subsections (Batch Reviews)

1. **Identify common patterns** across routes in the subsection
2. **Apply fixes systematically** - If one route needs a pattern, likely others do too
3. **Test representative routes** - Pick one or two routes to manually test after fixes
4. **Document pattern fixes** - Note recurring issues and solutions for other reviewers

### Sign-Off Criteria

A route can be signed off when:

- ✅ All applicable checklists have been reviewed
- ✅ Any issues found have been documented
- ✅ Critical issues have been fixed or have a remediation plan
- ✅ Route has been manually tested if changes were made
- ✅ Review notes capture context for future reviewers

---

## Severity Levels

When documenting issues, use these severity levels:

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| 🔴 **Critical** | Security vulnerability, data loss risk, system crash potential | Fix immediately before sign-off |
| 🟠 **High** | Performance degradation, significant usability issue | Fix before domain sign-off |
| 🟡 **Medium** | Code quality issue, minor performance concern | Document and plan fix |
| 🟢 **Low** | Enhancement opportunity, style inconsistency | Document for future improvement |

---

## Related Documentation

### Migration Guides
- [Migration Guide: secureRoute](./MIGRATION_GUIDE_SECURE_ROUTE.md)
- [Route Review Index](../ROUTE_REVIEW_INDEX.md)

### Workspace Rules
- [Consolidated Project Rules](../.cursor/rules/consolidated.mdc)
- [Security Rules](../.cursor/rules/security-rules.mdc)
- [Approval System Rules](../.cursor/rules/approval-system-rules.mdc)
- [Forvis Design Rules](../.cursor/rules/forvis-design-rules.mdc)
- [Blob Storage Rules](../.cursor/rules/blob-storage-rules.mdc)
- [AI Patterns](../.cursor/rules/ai-patterns.mdc)
- [Tool System Rules](../.cursor/rules/tool-system-rules.mdc)
