# Route Review Checklist

A systematic checklist for reviewing all API routes for security and performance optimization.

## Recent Updates

### December 26, 2024 - Route Discovery

Discovered **30 additional routes** that were not previously documented in the checklist:

**Service Lines (1 new route):**
- `GET /api/service-lines/user-accessible-groups` - Fully implemented, needs review

**Task Routes (29 new routes):**

*Research Notes (4 routes):*
- `GET /api/tasks/[id]/research-notes` - Implemented
- `POST /api/tasks/[id]/research-notes` - Implemented
- `PUT /api/tasks/[id]/research-notes/[noteId]` - Implemented
- `DELETE /api/tasks/[id]/research-notes/[noteId]` - Implemented

*AI Tax Report (2 routes):*
- `GET /api/tasks/[id]/ai-tax-report` - Implemented
- `POST /api/tasks/[id]/ai-tax-report` - Implemented

*Legal Precedents (2 routes):*
- `GET /api/tasks/[id]/legal-precedents` - Implemented
- `POST /api/tasks/[id]/legal-precedents` - Implemented

*SARS Responses (2 routes):*
- `GET /api/tasks/[id]/sars-responses` - Implemented
- `POST /api/tasks/[id]/sars-responses` - Implemented

*Engagement Letters (4 routes):*
- `GET /api/tasks/[id]/engagement-letter` - Implemented
- `POST /api/tasks/[id]/engagement-letter` - Implemented
- `POST /api/tasks/[id]/engagement-letter/generate` - Implemented
- `GET /api/tasks/[id]/engagement-letter/download` - Implemented

*Data Processing Agreement (3 routes):*
- `GET /api/tasks/[id]/dpa` - Implemented
- `POST /api/tasks/[id]/dpa` - Implemented
- `GET /api/tasks/[id]/dpa/download` - Implemented

*Notification Preferences (2 routes):*
- `GET /api/tasks/[id]/notification-preferences` - Implemented
- `PUT /api/tasks/[id]/notification-preferences` - Implemented

**Status:** All 30 newly discovered routes are awaiting security and performance review.

**Common Issues Found:**
- Most routes use raw handler pattern instead of `secureRoute` wrappers
- Missing explicit `select` fields in Prisma queries
- No `take` limits on list endpoints
- Missing `Cache-Control` headers
- Need IDOR protection verification
- Missing proper ID parsing utilities (`parseTaskId()`, `parseNumericId()`)

---

## Review Instructions

### Workflow Rules

1. **Review by SUB-SECTION** - Find the next unchecked subsection (e.g., `### Proposals`, `### Opportunities`, `### Activities`) and review ALL routes within that subsection as a batch.
2. **Complete the entire sub-section, then stop** - Check boxes for all routes in that section after review. Document fixes applied. Then stop and wait for the next instruction.
3. **Document any issues found** - Add notes below each route entry if issues are discovered or fixes are applied.
4. **Test after changes** - Verify routes still function correctly after optimization.

### How to Use This Checklist

1. Find the next unchecked **subsection** (identified by `###` headers like `### Proposals`, `### Activities`, etc.)
2. Read ALL route files within that subsection
3. For each route, run through the applicable checklists:
   - Security Checklist (all routes)
   - Performance Checklist (all routes)
   - Correctness & Observability Checklist (where applicable)
   - Data Integrity Checklist (for routes that modify data)
   - Resilience Checklist (for routes that call external APIs)
4. Apply fixes in batch where patterns are similar across routes
5. Check all boxes in the section and add review notes
6. Update the Progress Summary table
7. **Stop and confirm completion of the section**

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
- [ ] **IDOR protection** - User can only access resources they own/have permission for
- [ ] **Business logic authorization** - Beyond role checks (e.g., can't approve own submissions)

### Input Validation & Sanitization
- [ ] Input validation via Zod schema for request body
- [ ] Route params + querystring are validated (Zod / `parseXxxId()` utilities), not just body
- [ ] **Branded ID type usage** - All route params use `parseXxxId()` utilities per workspace rules
- [ ] `sanitizeObject()` applied to user input (automatic in secureRoute mutations)
- [ ] User-controlled sorting/filtering uses an allowlist (no raw field passthrough)
- [ ] List endpoints enforce safe limits (max `take`/page size; validate cursor/skip)
- [ ] **Mass assignment protection** - No spreading user input directly into Prisma `data`
- [ ] **No `any` types** - Use `unknown` or proper interfaces per workspace rules

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
- [ ] Outbound calls (if any) use allowlisted hosts + timeouts (SSRF + hanging request protection)
- [ ] **Response header hardening** - `X-Content-Type-Options: nosniff` for file downloads

### Code Quality & Import Consistency
- [ ] Correct import paths for core utilities:
  - `AppError`, `handleApiError`, `ErrorCodes` from `@/lib/utils/errorHandler`
  - `logger` from `@/lib/utils/logger`
  - `parseXxxId()` utilities from `@/lib/validation/idParsers`
  - `secureRoute`, `Feature` from `@/lib/api/secureRoute`
  - `successResponse` from `@/lib/utils/apiUtils`
- [ ] No stale imports (paths that no longer exist cause build failures)

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

## Correctness & Observability Review Checklist

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

### Observability
- [ ] Runtime is appropriate (Prisma/Node APIs run in Node.js, not Edge)
- [ ] Monitoring/logging includes enough context to debug (route, userId, resource ids) without logging secrets/PII
- [ ] **Correlation ID propagation** - Request ID in logs for distributed tracing

---

## Data Integrity Review Checklist

For routes that create, update, or delete data:

- [ ] Foreign key relationships are validated (referenced records exist before insert/update)
- [ ] Cascade deletes are intentional and documented
- [ ] Unique constraints are validated before insert (prevents race condition errors)
- [ ] Orphaned records are prevented (e.g., deleting parent doesn't orphan children without cleanup)
- [ ] Audit trail for sensitive data changes (who changed what, when)

---

## Resilience Review Checklist (External Integrations)

For routes that call external APIs or services:

- [ ] Circuit breaker pattern for external API failures
- [ ] Retry logic with exponential backoff + jitter
- [ ] Graceful degradation when dependencies unavailable
- [ ] Fallback values or cached responses for non-critical data
- [ ] Timeout configuration to prevent hanging requests
- [ ] Dead letter handling for failed async operations (if applicable)

---

## Progress Summary

| Category | Total | Reviewed | Status |
|----------|-------|----------|--------|
| Admin | 42 | 34 | 🔄 Needs Review (8 newly added routes) |
| Auth | 6 | 6 | ✅ Complete |
| BD | 29 | 29 | ✅ Complete |
| Clients | 22 | 22 | ✅ Complete |
| Tasks | 122 | 0 | 🔄 Needs Review (14 newly discovered routes) |
| Service Lines | 13 | 0 | 🔄 Needs Review (1 newly discovered route) |
| Groups | 7 | 7 | ✅ Complete |
| Notifications | 7 | 7 | ✅ Complete |
| Users | 6 | 6 | ✅ Complete |
| Tools | 14 | 14 | ✅ Complete |
| Utility | 87 | 85 | 🔄 Needs Review (2 newly added routes) |
| **Total** | **355** | **325** | 🔄 **40 NEW ROUTES DISCOVERED - AWAITING REVIEW** |

---

## Admin Routes (42)

### External Links

- [x] `GET /api/admin/external-links` - List all external links
  - **File**: `src/app/api/admin/external-links/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/external-links/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_EXTERNAL_LINKS` permission check for full list (non-activeOnly). Added deterministic secondary sort (`sortOrder`, `name`). Added `take: 100` limit.

- [x] `POST /api/admin/external-links` - Create external link
  - **File**: `src/app/api/admin/external-links/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/external-links/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Uses `secureRoute.mutation` with `MANAGE_EXTERNAL_LINKS` feature. Zod schema with `.strict()` prevents mass assignment. URL validation restricts to safe protocols. Explicit field mapping and select.

- [x] `PATCH /api/admin/external-links/[id]` - Update external link
  - **File**: `src/app/api/admin/external-links/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/external-links/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Uses `secureRoute.mutationWithParams` with feature permission. Validates ID param and checks existence before update. Explicit conditional field mapping prevents mass assignment.

- [x] `DELETE /api/admin/external-links/[id]` - Delete external link
  - **File**: `src/app/api/admin/external-links/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/external-links/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Uses `secureRoute.mutationWithParams` with feature permission. Validates ID param and checks existence before delete. No child records to cascade.

### Page Permissions

- [x] `GET /api/admin/page-permissions` - List page permissions
  - **File**: `src/app/api/admin/page-permissions/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation for query params (`merged`, `pathname`, `role`, `active`). Added `take` limit (500) to prevent unbounded queries. Added explicit `select` fields to Prisma queries in service.

- [x] `POST /api/admin/page-permissions` - Create page permission
  - **File**: `src/app/api/admin/page-permissions/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added explicit `select` fields to `createPagePermission` service. Schema already uses `.strict()` preventing mass assignment. Unique constraint check prevents duplicates.

- [x] `PUT /api/admin/page-permissions/[id]` - Update page permission
  - **File**: `src/app/api/admin/page-permissions/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced inline parseInt with `parseNumericId()` utility for proper error handling. Added explicit `select` to `updatePagePermission` service for both findUnique and update operations.

- [x] `DELETE /api/admin/page-permissions/[id]` - Delete page permission
  - **File**: `src/app/api/admin/page-permissions/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced inline parseInt with `parseNumericId()` utility. Added explicit `select` to `deletePagePermission` service findUnique. Cache invalidation already in place.

- [x] `POST /api/admin/page-permissions/bulk` - Bulk update permissions
  - **File**: `src/app/api/admin/page-permissions/bulk/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added explicit `select` to `bulkUpsertPagePermissions` service upsert. Schema uses `.strict()`. Uses transaction for atomicity. Cache invalidation in place.

- [x] `POST /api/admin/page-permissions/discover` - Discover available pages
  - **File**: `src/app/api/admin/page-permissions/discover/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Corrected HTTP method (POST not GET). Added explicit `select` to `syncPageRegistry` service upsert. Only fetches createdAt/updatedAt needed for logic.

- [x] `GET /api/admin/page-permissions/registry` - Get permission registry
  - **File**: `src/app/api/admin/page-permissions/registry/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/page-permissions/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation schema for query params (`active`, `category`). Route already had: `secureRoute.query` with `ACCESS_ADMIN` feature, explicit `select` fields, `take: 1000` limit, and deterministic ordering in service.

### Service Line Access

- [x] `GET /api/admin/service-line-access` - List service line access
  - **File**: `src/app/api/admin/service-line-access/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-lines/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_SERVICE_LINES` permission. Added Zod validation for query params (`serviceLine`, `userId`, `assignmentType`) with allowlist for valid service lines. Removed redundant `isSystemAdmin` check. Also updated POST/PUT/DELETE handlers in same file to use feature permission.

- [x] `POST /api/admin/service-line-access` - Create service line access
  - **File**: `src/app/api/admin/service-line-access/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-lines/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to `GrantServiceLineAccessSchema` for mass assignment protection. Route already has: `Feature.MANAGE_SERVICE_LINES`, rate limiting, Zod schema validation, audit logging, explicit `select` in Prisma queries.

- [x] `PUT /api/admin/service-line-access` - Update service line access
  - **File**: `src/app/api/admin/service-line-access/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-lines/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to both `UpdateServiceLineRoleSchema` and `SwitchAssignmentTypeSchema`. Added `action: z.literal('switchType')` to `SwitchAssignmentTypeSchema` for proper discriminated union matching. Route already has: feature permission, rate limiting, Zod schema validation.

- [x] `DELETE /api/admin/service-line-access` - Delete service line access
  - **File**: `src/app/api/admin/service-line-access/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-lines/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to `RevokeServiceLineAccessSchema`. Replaced ad-hoc error responses with `AppError` for consistent error handling. Route already has: feature permission, rate limiting, Zod validation, audit logging.

### Service Line Mapping

- [x] `GET /api/admin/service-line-mapping` - List mappings
  - **File**: `src/app/api/admin/service-line-mapping/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added explicit `select` fields and `take` limits to `getAllExternalServiceLines()` and `getAllServiceLines()` utility functions. Route already has: `Feature.MANAGE_SERVICE_LINES` permission.

- [x] `POST /api/admin/service-line-mapping` - Create mapping
  - **File**: `src/app/api/admin/service-line-mapping/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route does NOT exist. Mappings are updated via `PUT /[id]` or created in bulk via `/bulk`. No action needed.

- [x] `PUT /api/admin/service-line-mapping/[id]` - Update mapping
  - **File**: `src/app/api/admin/service-line-mapping/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to schema. Replaced inline parseInt with `parseNumericId()` utility. Added explicit `select` to `setExternalMapping()` function.

- [x] `POST /api/admin/service-line-mapping/bulk` - Bulk create mappings
  - **File**: `src/app/api/admin/service-line-mapping/bulk/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to schema. Added `.max(100)` limit on array. Added rate limiting (10 req). Added masterCode existence validation before update. Used `AppError` for validation errors.

- [x] `GET /api/admin/service-line-mapping/stats` - Get mapping statistics
  - **File**: `src/app/api/admin/service-line-mapping/stats/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route already properly secured with `Feature.MANAGE_SERVICE_LINES`. Uses `getMappingStatistics()` which calls `getAllExternalServiceLines()` (already updated with explicit select and limits). No changes needed.

### Review Categories

- [x] `GET /api/admin/review-categories` - List review categories
  - **File**: `src/app/api/admin/review-categories/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Added Zod validation schema `ListCategoriesQuerySchema` for query params with `.strict()`. Added `take: 200` limit. Added deterministic tertiary sort (`id`). Schema `CreateReviewCategorySchema` already has `.strict()`.

- [x] `POST /api/admin/review-categories` - Create review category
  - **File**: `src/app/api/admin/review-categories/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Replaced ad-hoc error response with `AppError` for duplicate name validation. Added explicit `select` to duplicate check query. Schema already has `.strict()`, explicit field mapping, and explicit `select` on create.

- [x] `GET /api/admin/review-categories/[id]` - Get category details
  - **File**: `src/app/api/admin/review-categories/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Replaced inline `parseInt` with `parseNumericId()` utility. Already has explicit `select` fields including `_count` for related notes.

- [x] `PUT /api/admin/review-categories/[id]` - Update category
  - **File**: `src/app/api/admin/review-categories/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Replaced inline `parseInt` with `parseNumericId()`. Replaced ad-hoc error response with `AppError` for duplicate validation. Added explicit `select` to existence check and duplicate check queries. Schema already has `.strict()`.

- [x] `DELETE /api/admin/review-categories/[id]` - Delete category
  - **File**: `src/app/api/admin/review-categories/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Replaced inline `parseInt` with `parseNumericId()`. Replaced ad-hoc error response with `AppError`. Orphan prevention logic already in place (prevents deletion if notes exist).

### Service Line Master

- [x] `GET /api/admin/service-lines` - List active service lines
  - **File**: `src/app/api/admin/service-lines/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Updated `getActiveServiceLines()` utility function in `src/lib/utils/serviceLine.ts` to include explicit `select` fields, `take: 100` limit, and deterministic secondary sort (`code`). Route already uses secureRoute.query with Feature.MANAGE_TOOLS and successResponse wrapper.

- [x] `GET /api/admin/service-line-master` - List master service lines
  - **File**: `src/app/api/admin/service-line-master/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-master/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `take: 100` limit. Route already has: feature permission, explicit `select` fields, deterministic ordering.

- [x] `POST /api/admin/service-line-master` - Create master service line
  - **File**: `src/app/api/admin/service-line-master/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-master/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added rate limiting (20 req). Route already has: feature permission, schema with `.strict()`, unique constraint checks, explicit `select` fields, `AppError` for validation.

- [x] `PUT /api/admin/service-line-master/[code]` - Update master service line
  - **File**: `src/app/api/admin/service-line-master/[code]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-master/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `safeIdentifier` validation for `code` route param. Wrapped unique name check + update in transaction to prevent race conditions. Added `invalidateServiceLineCache()` after update. Added `auditAdminAction()` for audit logging. Also improved GET and DELETE handlers with same param validation, cache invalidation, and audit logging.

- [x] `DELETE /api/admin/service-line-master/[code]` - Delete master service line
  - **File**: `src/app/api/admin/service-line-master/[code]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-master/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Fixed as part of PUT review. Added `safeIdentifier` validation for `code` route param. Added `invalidateServiceLineCache()` after delete. Added `auditAdminAction()` for audit logging. Already had: feature permission, existence check, relationship check preventing orphaned records, explicit `select` fields.

- [x] `POST /api/admin/service-line-master/reorder` - Reorder service lines
  - **File**: `src/app/api/admin/service-line-master/reorder/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-line-master/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.max(100)` limit to schema items array. Added `.max(50)` to code field and `.min(0).max(10000)` to sortOrder. Added existence validation before batch update. Added `take: 100` limit on findMany response. Added `invalidateServiceLineCache()` after update. Added `auditAdminAction()` for audit logging. Added explicit `select: { code: true }` to transaction updates.

### Sub Service Line Groups

- [x] `GET /api/admin/sub-service-line-groups` - List sub-groups
  - **File**: `src/app/api/admin/sub-service-line-groups/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/service-lines/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `take: 500` limit on findMany to prevent unbounded queries. Added empty array guard for second query when no groups found. Route already has: `secureRoute.query` with feature permission, explicit `select` fields, deterministic ordering, `distinct` clause.

### Templates

- [x] `GET /api/admin/templates` - List templates
  - **File**: `src/app/api/admin/templates/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check (feature permission handled by secureRoute). Added Zod validation schema for query params with type allowlist. Updated service `getTemplates()` to use explicit `select` instead of `include`. Added `take: 100` limit. Added deterministic secondary sort (`id`). Changed POST to use explicit field mapping instead of spread.

- [x] `POST /api/admin/templates` - Create template
  - **File**: `src/app/api/admin/templates/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Fixed as part of GET review. Removed redundant `isSystemAdmin()` check. Changed from spread (`...data`) to explicit field mapping for mass assignment protection. Schema already has `.strict()`.

- [x] `GET /api/admin/templates/[id]` - Get template details
  - **File**: `src/app/api/admin/templates/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check (feature permission handles auth). Replaced `Number.parseInt()` with `parseNumericId()` utility for consistent error handling. Updated `getTemplateById()` service to use explicit `select` instead of `include`. Also fixed PUT and DELETE handlers with same improvements and updated `createTemplate()` and `updateTemplate()` services to use explicit `select`.

- [x] `PUT /api/admin/templates/[id]` - Update template
  - **File**: `src/app/api/admin/templates/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Fixed as part of GET review. Uses `secureRoute.mutationWithParams` with feature permission, `UpdateTemplateSchema` with `.strict()` for mass assignment protection, `parseNumericId()` for param validation, explicit `select` in service.

- [x] `DELETE /api/admin/templates/[id]` - Delete template
  - **File**: `src/app/api/admin/templates/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Fixed as part of GET review. Uses `secureRoute.mutationWithParams` with feature permission, `parseNumericId()` for param validation. Service logs deletion with `logger.info`.

- [x] `POST /api/admin/templates/[id]/copy` - Copy template
  - **File**: `src/app/api/admin/templates/[id]/copy/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check (feature permission handles auth). Replaced `Number.parseInt()` with `parseNumericId()` utility for consistent error handling. Updated `copyTemplate()` service to use explicit `select` instead of `include` for both the source template fetch and the created template response.

- [x] `GET /api/admin/templates/[id]/sections` - List template sections
  - **File**: `src/app/api/admin/templates/[id]/sections/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check (feature permission handles auth). Replaced `Number.parseInt()` with `parseNumericId()` utility. Updated `getTemplateSections()` service to use explicit `select` fields and added `take: 100` limit to prevent unbounded queries.

- [x] `POST /api/admin/templates/[id]/sections` - Create template section
  - **File**: `src/app/api/admin/templates/[id]/sections/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check and unused import. Replaced `Number.parseInt()` with `parseNumericId()` utility. Changed from spread operator to explicit field mapping. Updated `createTemplateSection()` service to use explicit `select` fields and added template existence validation before creating section.

- [x] `PUT /api/admin/templates/[id]/sections/[sectionId]` - Update section
  - **File**: `src/app/api/admin/templates/[id]/sections/[sectionId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed redundant `isSystemAdmin()` check and unused import. Replaced `Number.parseInt()` with `parseNumericId()` utility for both template and section IDs. Updated `updateTemplateSection()` service to use explicit `select` fields.

- [x] `DELETE /api/admin/templates/[id]/sections/[sectionId]` - Delete section
  - **File**: `src/app/api/admin/templates/[id]/sections/[sectionId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/templates/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed broken `isSystemAdmin()` reference (was causing runtime error after import was removed). Replaced `Number.parseInt()` with `parseNumericId()` utility for both template and section IDs. Feature permission handles authorization.

### Document Vault

- [ ] `GET /api/admin/document-vault/types` - List all document types
  - **File**: `src/app/api/admin/document-vault/types/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/document-vault/types/page.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.query` with `Feature.MANAGE_VAULT_DOCUMENTS`. SYSTEM_ADMIN role check. Needs review.

- [ ] `POST /api/admin/document-vault/types` - Create new document type
  - **File**: `src/app/api/admin/document-vault/types/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/document-vault/types/page.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.mutation` with `Feature.MANAGE_VAULT_DOCUMENTS`. SYSTEM_ADMIN only. Has unique constraint check. Needs review.

- [ ] `PATCH /api/admin/document-vault/types/[id]` - Update document type
  - **File**: `src/app/api/admin/document-vault/types/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/document-vault/types/page.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.mutationWithParams` with `Feature.MANAGE_VAULT_DOCUMENTS`. SYSTEM_ADMIN only. Has cache invalidation. Needs review.

- [ ] `DELETE /api/admin/document-vault/types/[id]` - Delete document type
  - **File**: `src/app/api/admin/document-vault/types/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/document-vault/types/page.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.mutationWithParams` with `Feature.MANAGE_VAULT_DOCUMENTS`. SYSTEM_ADMIN only. Needs orphan check. Needs review.

- [ ] `GET /api/admin/document-vault/categories/[id]/approvers` - List category approvers
  - **File**: `src/app/api/admin/document-vault/categories/[id]/approvers/route.ts`
  - **Frontend**: 
    - Component: `CategoryApproverModal.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.query` with `Feature.MANAGE_DOCUMENT_VAULT`. Returns approvers with user details. Needs review.

- [ ] `POST /api/admin/document-vault/categories/[id]/approvers` - Set category approvers
  - **File**: `src/app/api/admin/document-vault/categories/[id]/approvers/route.ts`
  - **Frontend**: 
    - Component: `CategoryApproverModal.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.mutation` with `Feature.MANAGE_DOCUMENT_VAULT`. Uses transaction for atomic updates. Has cache invalidation. Needs review.

- [ ] `DELETE /api/admin/document-vault/categories/[id]/approvers` - Remove category approvers
  - **File**: `src/app/api/admin/document-vault/categories/[id]/approvers/route.ts`
  - **Frontend**: 
    - Component: `CategoryApproverModal.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.mutation` with `Feature.MANAGE_DOCUMENT_VAULT`. Has cache invalidation. Needs review.

### Users

- [x] `GET /api/admin/users` - List users
  - **File**: `src/app/api/admin/users/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `take: 500` limit on users query. Added `take: 50` limit on TaskTeam per user. Added deterministic secondary sort (`id`). Route already has: `secureRoute.query` with `MANAGE_USERS` feature, explicit `select` fields. Note: N+1 pattern exists for `getUserServiceLines()` per user but acceptable for admin route.

- [x] `GET /api/admin/users/[userId]` - Get user details
  - **File**: `src/app/api/admin/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_USERS` permission. Removed redundant `isSystemAdmin()` check and unused import. Added userId param validation. Changed from `include` to explicit `select` fields. Added `take: 100` limit on TaskTeam. Used `AppError` for consistent error handling and `successResponse` wrapper.

- [x] `PUT /api/admin/users/[userId]/system-role` - Update user system role
  - **File**: `src/app/api/admin/users/[userId]/system-role/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to schema for mass assignment protection. Added userId param validation. Replaced ad-hoc error responses with `AppError` for consistency. Route already has: `isSystemAdmin()` check (appropriate for system role changes), rate limiting, audit logging, self-demotion prevention, explicit `select` fields.

- [x] `GET /api/admin/users/[userId]/tasks` - Get user tasks
  - **File**: `src/app/api/admin/users/[userId]/tasks/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route does NOT exist. User tasks are included in `GET /api/admin/users/[userId]` response (TaskTeam with nested Task data). No action needed.

- [x] `POST /api/admin/users/[userId]/tasks` - Assign task to user
  - **File**: `src/app/api/admin/users/[userId]/tasks/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_USERS` permission. Removed redundant `isSystemAdmin()` check and unused import. Added `.strict()` to schemas with `.max(100)` limit on taskIds. Changed role to enum validation. Added userId param validation. Added explicit `select` to all Prisma queries. Used `AppError` and `successResponse` for consistency.

- [x] `PUT /api/admin/users/[userId]/tasks` - Update user task assignment
  - **File**: `src/app/api/admin/users/[userId]/tasks/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_USERS` permission. Removed broken `isSystemAdmin()` reference (was causing runtime error). Added userId param validation. Used `successResponse` wrapper. Schema already fixed in POST review.

- [x] `DELETE /api/admin/users/[userId]/tasks` - Remove task from user
  - **File**: `src/app/api/admin/users/[userId]/tasks/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.MANAGE_USERS` permission. Removed broken `isSystemAdmin()` reference (was causing runtime error). Added userId param validation. Used `successResponse` wrapper. Schema already fixed in POST review.

- [ ] `GET /api/admin/users/search` - Search users by name or email
  - **File**: `src/app/api/admin/users/search/route.ts`
  - **Frontend**: 
    - Component: `CategoryApproverModal.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.query` with `Feature.MANAGE_DOCUMENT_VAULT`. Has 2 character min query length. Max 20 results with deterministic ordering. Needs review.

---

## Auth Routes (6)

- [x] `GET /api/auth/callback` - OAuth callback handler
  - **File**: `src/app/api/auth/callback/route.ts`
  - **Frontend**: 
    - Page: `src/app/auth/signin/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: 
    - **HIGH: Open Redirect Vulnerability** - Added `validateCallbackUrl()` function to prevent open redirects via the `auth_callback_url` cookie. Now validates URLs are same-origin or relative paths only.
    - **MEDIUM: PII in logs** - Removed `email` from log output (line 77), replaced with `redirectPath`.
    - **LOW: `any` type** - Changed `errorDetails: any` to `Record<string, unknown>` for type safety.
    - Also updated `/api/auth/login` route with same URL validation (defense in depth).

- [x] `GET /api/auth/login` - Initiate login
  - **File**: `src/app/api/auth/login/route.ts`
  - **Frontend**: 
    - Page: `src/app/auth/signin/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route was already updated during callback review with `validateCallbackUrl()` for open redirect protection. Has rate limiting, secure cookie settings (httpOnly, secure, sameSite), proper error handling with redirect. No changes needed.

- [x] `POST /api/auth/logout` - Logout current session
  - **File**: `src/app/api/auth/logout/route.ts`
  - **Frontend**: 
    - Page: `src/app/auth/signout/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: 
    - **MEDIUM: Missing rate limiting** - Added `enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS)` to both GET and POST handlers.
    - **LOW: Missing audit logging** - Added `logInfo()` calls for logout events with userId for audit trail.
  - **Notes**: Also has GET handler for redirect-based logout. Cache-Control headers properly set. Session cookie properly deleted.

- [x] `POST /api/auth/logout-all` - Logout all sessions
  - **File**: `src/app/api/auth/logout-all/route.ts`
  - **Frontend**: 
    - Page: `src/app/auth/signout/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: 
    - **MEDIUM: Missing rate limiting** - Added `enforceRateLimit(request, RateLimitPresets.AUTH_ENDPOINTS)` to both GET and POST handlers.
    - **LOW: Missing audit logging** - Added `logInfo()` calls for logout-all events with userId.
  - **Notes**: Has both POST (JSON response) and GET (redirect) handlers. Session validation, Cache-Control headers, and cookie cleanup all correct.

- [x] `GET /api/auth/me` - Get current user
  - **File**: `src/app/api/auth/me/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/auth/usePermissions.ts`
    - Component: Auth context/provider
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Cache-Control: no-store` header for user-specific data. Route already has: `secureRoute.query`, rate limiting, `successResponse` wrapper, explicit `select` in `getUserSystemRole`.

- [x] `GET /api/auth/session` - Get session details
  - **File**: `src/app/api/auth/session/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/auth/usePermissions.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `successResponse` wrapper for consistency. Added `Cache-Control: no-store` header for user-specific data. Changed to return explicit fields instead of raw user object. Route already has: `secureRoute.query`, rate limiting, `force-dynamic` export.

---

## BD Routes (17)

### Activities

- [x] `GET /api/bd/activities` - List BD activities
  - **File**: `src/app/api/bd/activities/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useActivities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route already properly secured with `secureRoute.query`, `Feature.ACCESS_BD`, Zod validation with `.strict()`, pagination with `.max(100)` pageSize. Service uses `Promise.all()` for parallel queries.

- [x] `POST /api/bd/activities` - Create BD activity
  - **File**: `src/app/api/bd/activities/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useActivities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Changed from spread operator to explicit field mapping for mass assignment protection. Route already has: `secureRoute.mutation`, feature permission, Zod schema with `.strict()`.

- [x] `GET /api/bd/activities/[id]` - Get activity details
  - **File**: `src/app/api/bd/activities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useActivities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_BD` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed from `include` to explicit `select` fields. Replaced ad-hoc errors with `AppError`.

- [x] `PUT /api/bd/activities/[id]` - Update activity
  - **File**: `src/app/api/bd/activities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useActivities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before update, explicit field mapping. Now has rate limiting via secureRoute.

- [x] `DELETE /api/bd/activities/[id]` - Delete activity
  - **File**: `src/app/api/bd/activities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useActivities.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete. Now has rate limiting via secureRoute.

### Analytics

- [x] `GET /api/bd/analytics/conversion` - Get conversion metrics
  - **File**: `src/app/api/bd/analytics/conversion/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useBDAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.query`. Added `Feature.ACCESS_BD` permission. Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route now has rate limiting via secureRoute.

- [x] `GET /api/bd/analytics/forecast` - Get forecast data
  - **File**: `src/app/api/bd/analytics/forecast/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useBDAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.query`. Added `Feature.ACCESS_BD` permission. Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route now has rate limiting via secureRoute.

- [x] `GET /api/bd/analytics/pipeline` - Get pipeline metrics
  - **File**: `src/app/api/bd/analytics/pipeline/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useBDAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route already had `secureRoute.query` with feature permission.

### Contacts

- [x] `GET /api/bd/contacts` - List BD contacts
  - **File**: `src/app/api/bd/contacts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation for query params with `.max(100)` on pageSize. Added explicit `select` fields. Added deterministic secondary sort (`id`). Route already had secureRoute with feature permission.

- [x] `POST /api/bd/contacts` - Create BD contact
  - **File**: `src/app/api/bd/contacts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Changed from spread operator to explicit field mapping. Added explicit `select` fields on response. Schema already has `.strict()`.

- [x] `GET /api/bd/contacts/[id]` - Get contact details
  - **File**: `src/app/api/bd/contacts/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added feature permission, `parseNumericId()`, explicit `select` fields, `AppError` for consistent error handling.

- [x] `PUT /api/bd/contacts/[id]` - Update contact
  - **File**: `src/app/api/bd/contacts/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check, explicit field mapping, explicit `select` fields.

- [x] `DELETE /api/bd/contacts/[id]` - Delete contact
  - **File**: `src/app/api/bd/contacts/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete.

### Opportunities

- [x] `GET /api/bd/opportunities` - List opportunities
  - **File**: `src/app/api/bd/opportunities/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route already properly secured with `secureRoute.query`, `Feature.ACCESS_BD`, Zod validation. Service has pagination and explicit select on relations.

- [x] `POST /api/bd/opportunities` - Create opportunity
  - **File**: `src/app/api/bd/opportunities/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Changed from spread operator to explicit field mapping. Schema already has `.strict()`.

- [x] `GET /api/bd/opportunities/[id]` - Get opportunity details
  - **File**: `src/app/api/bd/opportunities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Changed ad-hoc error response to `AppError`. Already had secureRoute with feature permission.

- [x] `PUT /api/bd/opportunities/[id]` - Update opportunity
  - **File**: `src/app/api/bd/opportunities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Added existence check before update. Added explicit field mapping instead of passing data directly.

- [x] `DELETE /api/bd/opportunities/[id]` - Delete opportunity
  - **File**: `src/app/api/bd/opportunities/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Added existence check before delete. Removed `z.ZodAny` type.

- [x] `POST /api/bd/opportunities/[id]/convert` - Convert to client/task
  - **File**: `src/app/api/bd/opportunities/[id]/convert/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check, already-converted validation.

- [x] `PUT /api/bd/opportunities/[id]/stage` - Update opportunity stage
  - **File**: `src/app/api/bd/opportunities/[id]/stage/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before stage move.

- [x] `GET /api/bd/opportunities/pipeline` - Get pipeline view
  - **File**: `src/app/api/bd/opportunities/pipeline/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.query`. Added feature permission, Zod validation for query params. Added `take: 500` limit to service.

### Proposals

- [x] `GET /api/bd/proposals` - List proposals
  - **File**: `src/app/api/bd/proposals/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation for query params (`opportunityId`, `status`, `page`, `pageSize`) with `.max(100)` on pageSize. Changed from `include` to explicit `select` fields. Added deterministic secondary sort (`id`).

- [x] `POST /api/bd/proposals` - Create proposal
  - **File**: `src/app/api/bd/proposals/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Fixed double body parsing issue (was parsing body twice). Changed from spread operator to explicit field mapping for mass assignment protection. Added `CreateProposalWithFileSchema` to validate file metadata in body. Added opportunity existence validation. Changed from `include` to explicit `select` fields. Replaced ad-hoc error with `AppError`.

- [x] `GET /api/bd/proposals/[id]` - Get proposal details
  - **File**: `src/app/api/bd/proposals/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_BD` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed from `include` to explicit `select` fields. Replaced ad-hoc error with `AppError`.

- [x] `PUT /api/bd/proposals/[id]` - Update proposal
  - **File**: `src/app/api/bd/proposals/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before update, explicit field mapping instead of passing `validated` directly. Changed from `include` to explicit `select` fields.

- [x] `DELETE /api/bd/proposals/[id]` - Delete proposal
  - **File**: `src/app/api/bd/proposals/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete.

### Stages

- [x] `GET /api/bd/stages` - List BD stages
  - **File**: `src/app/api/bd/stages/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useOpportunities.ts`
    - Page: `src/app/dashboard/[serviceLine]/bd/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation for `serviceLine` query param. Added explicit `select` fields. Added deterministic secondary sort (`id`). Added `take: 100` limit.

### Company Research

- [x] `GET /api/bd/company-research` - Check research service availability
  - **File**: `src/app/api/bd/company-research/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useCompanyResearch.ts`
    - Component: `src/components/features/bd/CompanyResearchModal.tsx`
    - Used in: `src/components/features/bd/OpportunityForm.tsx`
  - **Reviewed**: 2024-12-23
  - **Notes**: Uses `secureRoute.query` with `Feature.ACCESS_BD`. Simple availability check, no database queries. Proper error handling and response wrapper.

- [x] `POST /api/bd/company-research` - Research company using AI
  - **File**: `src/app/api/bd/company-research/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/bd/useCompanyResearch.ts`
    - Component: `src/components/features/bd/CompanyResearchModal.tsx`
    - Used in: `src/components/features/bd/OpportunityForm.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Replaced `as any` with `Record<string, unknown>` in `companyResearchAgent.ts` (lines 157, 183). Added proper type guards for source mapping to eliminate all `any` types. Route already uses: `secureRoute.ai` (strict AI rate limiting), `CompanyResearchSchema` with `.strict()`, proper `logger` usage, `AppError` for errors, graceful fallback on external API failure.

---

## Client Routes (21)

### Client List & Details

- [x] `GET /api/clients` - List clients with pagination
  - **File**: `src/app/api/clients/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClients.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `ClientListQuerySchema` Zod validation for query params (search, page, limit, sortBy, sortOrder). Added `AppError` for consistent error handling. Added deterministic secondary sort (`GSClientID`) for pagination stability. Sort field allowlist already existed and was moved to Zod enum.

- [x] `GET /api/clients/filters` - Get client filter options
  - **File**: `src/app/api/clients/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientFilters.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `ClientFiltersQuerySchema` Zod validation for query params (industrySearch, groupSearch). Added `AppError` for consistent error handling. Route already had: `take` limit of 30, caching, parallel queries.

- [x] `GET /api/clients/[id]` - Get client details
  - **File**: `src/app/api/clients/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClients.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `ClientDetailQuerySchema` Zod validation for query params (taskPage, taskLimit, serviceLine, includeArchived). Changed ad-hoc error responses to `AppError`. Route already has: GSClientID validation, caching, explicit `select` fields, Promise.all for parallel queries.

- [x] `PUT /api/clients/[id]` - Update client
  - **File**: `src/app/api/clients/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Changed ad-hoc error responses to `AppError`. Changed from data spread to explicit field mapping for mass assignment protection. Added explicit `select` to all Prisma queries including findUnique and update response. Route already has: UpdateClientSchema with validation, GSClientID validation, duplicate check, cache invalidation.

- [x] `DELETE /api/clients/[id]` - Delete client
  - **File**: `src/app/api/clients/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `z.ZodAny` with `z.ZodUndefined` (no `any` types). Changed `include` to explicit `select` fields. Changed ad-hoc error responses to `AppError`. Added `invalidateClientListCache()` on delete (was missing). Route already has: GSClientID validation, orphan prevention (task count check), existence check.

### Client Analytics

- [x] `GET /api/clients/[id]/analytics/graphs` - Get daily transaction metrics
  - **File**: `src/app/api/clients/[id]/analytics/graphs/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientGraphData.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Added Zod validation schema `GraphsQuerySchema` for `resolution` query param with enum allowlist (`high`, `standard`, `low`). Added `Cache-Control: no-store` header for user-specific analytics data. Parallelized 3 independent database queries (client info + tasks + service line mappings, then opening balance + transactions) using `Promise.all()` for better performance. Added audit logging with `logger.info()` for analytics access (both cached and fresh). Updated cache key to include resolution parameter. Route already had: `secureRoute.queryWithParams` with `Feature.ACCESS_CLIENTS`, explicit `select` fields, `take` limits (10000 tasks, 100000 opening txns, 50000 txns, 100 service lines), smart downsampling algorithm, shared transaction categorization logic.

- [x] `GET /api/clients/[id]/analytics/documents` - List analytics documents
  - **File**: `src/app/api/clients/[id]/analytics/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/analytics/useClientAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Added `take: 100` limit. Added explicit `select` fields. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/clients/[id]/analytics/documents` - Upload analytics document
  - **File**: `src/app/api/clients/[id]/analytics/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.fileUploadWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Added Zod validation for `documentType` field. Added explicit `select` on create response. File validation was already robust (size, MIME, magic number verification).

- [x] `GET /api/clients/[id]/analytics/documents/[documentId]` - Get document details
  - **File**: `src/app/api/clients/[id]/analytics/documents/[documentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Added explicit `select` fields. Replaced ad-hoc errors with `AppError`.

- [x] `DELETE /api/clients/[id]/analytics/documents/[documentId]` - Delete document
  - **File**: `src/app/api/clients/[id]/analytics/documents/[documentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed `include` to explicit `select`. Added `take: 10` limit on rating check. Replaced ad-hoc errors with `AppError`.

- [x] `GET /api/clients/[id]/analytics/rating` - Get client rating history
  - **File**: `src/app/api/clients/[id]/analytics/rating/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/analytics/useClientAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Changed `include` to explicit `select` fields. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/clients/[id]/analytics/rating` - Generate AI credit rating
  - **File**: `src/app/api/clients/[id]/analytics/rating/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.aiWithParams` (strict AI rate limiting). Added `Feature.MANAGE_CLIENTS` permission. Changed `include` to explicit `select` in transaction. Replaced ad-hoc errors with `AppError`. Schema validation handled by secureRoute.

- [x] `GET /api/clients/[id]/analytics/rating/[ratingId]` - Get rating details
  - **File**: `src/app/api/clients/[id]/analytics/rating/[ratingId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed `include` to explicit `select` fields. Replaced ad-hoc errors with `AppError`.

- [x] `DELETE /api/clients/[id]/analytics/rating/[ratingId]` - Delete rating
  - **File**: `src/app/api/clients/[id]/analytics/rating/[ratingId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Added explicit `select` on existence check. Added audit logging with `logger.info` for sensitive deletion. Replaced ad-hoc errors with `AppError`.
  - **Notes**: PUT route does NOT exist in this file - only GET and DELETE. Checklist entry for PUT was incorrect.

- [x] `GET /api/clients/[id]/analytics/ratios` - Get financial ratios
  - **File**: `src/app/api/clients/[id]/analytics/ratios/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/analytics/useClientAnalytics.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced ad-hoc errors with `AppError`. Route already had explicit `select` fields.

### Client Financial Data

- [x] `GET /api/clients/[id]/balances` - Get client balances
  - **File**: `src/app/api/clients/[id]/balances/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientBalances.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added `take: 10000` limit on client tasks query. Parallelized debtor aggregation and timestamp queries with `Promise.all()`. Route already had caching.

- [x] `GET /api/clients/[id]/debtors` - Get client debtors
  - **File**: `src/app/api/clients/[id]/debtors/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDebtors.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take` limits on service line queries. Parallelized debtor transactions and service line mappings queries.

- [x] `GET /api/clients/[id]/debtors/details` - Get debtor details
  - **File**: `src/app/api/clients/[id]/debtors/details/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDebtorDetails.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take` limits on service line queries. Parallelized debtor transactions and service line mappings queries.

- [x] `GET /api/clients/[id]/wip` - Get client WIP
  - **File**: `src/app/api/clients/[id]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientWip.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take: 100` limit on master service lines query. Parallelized CARL partner codes and WIP transactions queries. Removed unused `MasterServiceLineInfo` interface.

### Client Documents

- [x] `GET /api/clients/[id]/documents` - List client documents
  - **File**: `src/app/api/clients/[id]/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDocuments.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Added `take` limits on all queries (500 for tasks, 200 for each document type, 100 for users). Changed `include` to explicit `select` on OpinionDocument query. Added deterministic secondary sort (`id`) on all document queries. Changed `Cache-Control` from `private, s-maxage=60` to `no-store` for user-specific data per workspace rules.

- [x] `POST /api/clients/[id]/documents` - Upload document
  - **File**: `src/app/api/clients/[id]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route does NOT exist. Document uploads are handled at the task level via `POST /api/tasks/[id]/workspace/files` or `POST /api/tasks/[id]/acceptance/documents`. The `/api/clients/[id]/documents` endpoint is read-only (aggregates documents across all client tasks). No action needed.

- [x] `GET /api/clients/[id]/documents/download` - Download document
  - **File**: `src/app/api/clients/[id]/documents/download/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Added `DownloadQuerySchema` Zod validation for query params (documentType, documentId, taskId) with proper enum validation. Replaced `Number.parseInt()` with `parseNumericId()`. Added `validateFilePath()` function to prevent path traversal attacks (validates normalized path, checks for `..`, restricts to allowed base directories). Added explicit `select` on all Prisma queries. Replaced ad-hoc errors with `AppError`. Added `X-Content-Type-Options: nosniff` security header. Added audit logging for downloads. Changed `Cache-Control` to `no-store`.

---

## Task Routes (90)

### Task List & Details

- [x] `GET /api/tasks` - List tasks with pagination
  - **File**: `src/app/api/tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTasks.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `TaskListQuerySchema` Zod validation for all query params (page, limit, search, sortBy, sortOrder, status, etc.) with proper enums and max lengths. Added deterministic secondary sort (`id`). Replaced ad-hoc error response with `AppError`. Removed unused imports.

- [x] `POST /api/tasks` - Create task
  - **File**: `src/app/api/tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useCreateTask.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced ad-hoc error with `AppError`. Added explicit `select` to user lookup. Route already has: `secureRoute.mutation` with `MANAGE_TASKS` feature, `CreateTaskSchema` validation, transaction, explicit field mapping, cache invalidation, audit logging.

- [x] `GET /api/tasks/[id]` - Get task details
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskData.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced all ad-hoc error responses with `AppError`. Route already has: `secureRoute.queryWithParams`, `checkTaskAccess`, `parseTaskId`, explicit `select` fields, caching.

- [x] `PUT /api/tasks/[id]` - Update task
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskData.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `UpdateTaskSchema` Zod schema with `.strict()` for mass assignment protection. Changed from `include` to explicit `select` fields. Replaced ad-hoc errors with `AppError`. Route already has: `secureRoute.mutationWithParams`, `checkTaskAccess` with EDITOR role, cache invalidation.

- [x] `DELETE /api/tasks/[id]` - Soft delete task
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Used `parseTaskId` for consistent ID validation. Added explicit `select` fields. Replaced ad-hoc errors with `AppError`. Route already has: `secureRoute.mutationWithParams`, `checkTaskAccess` with ADMIN role, cache invalidation.
  - **Notes**: Also fixed PATCH handler with `TaskActionSchema` Zod validation, `parseTaskId`, and `AppError`.

- [x] `DELETE /api/tasks/[id]/permanent` - Permanently delete task
  - **File**: `src/app/api/tasks/[id]/permanent/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Removed `z.ZodAny` type (no `any` types). Replaced `Number.parseInt()` with `parseNumericId()` utility. Added cache invalidation after delete. Added `successResponse` wrapper. Replaced ad-hoc errors with `AppError`. Route already has: `secureRoute.mutationWithParams` with `MANAGE_TASKS` feature, existence check, transaction, audit logging.

- [x] `GET /api/tasks/filters` - Get task filter options
  - **File**: `src/app/api/tasks/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskFilters.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `TaskFiltersQuerySchema` Zod validation for query params (serviceLine, subServiceLineGroup, clientSearch, taskNameSearch, partnerSearch, managerSearch). Route already has: `secureRoute.query` with `ACCESS_TASKS` feature, `take` limits (30), caching, parallel queries with `Promise.all`.

- [x] `POST /api/tasks/check-duplicate` - Check for duplicate task
  - **File**: `src/app/api/tasks/check-duplicate/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useCheckDuplicateTaskCode.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to `CheckDuplicateSchema` for mass assignment protection. Added `take: 100` limit to both findMany queries to prevent unbounded queries. Route already has: `secureRoute.mutation` with `MANAGE_TASKS` feature, Zod schema validation, explicit `select` fields.
  - **Notes**: Checklist incorrectly listed as GET - this is POST.

- [x] `GET /api/tasks/kanban` - Get kanban board data
  - **File**: `src/app/api/tasks/kanban/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useKanbanBoard.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.ACCESS_TASKS` permission. Added `KanbanQuerySchema` Zod validation for all query params with proper max lengths. Route already has: `secureRoute.query`, service line access checks, caching, explicit `select` fields, parameterized raw SQL queries (safe from injection).

### Task Stage & Status

- [x] `GET /api/tasks/[id]/stage` - Get task stage and history
  - **File**: `src/app/api/tasks/[id]/stage/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskStage.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to schema. Replaced ad-hoc error responses with `AppError`. Added `take: 100` limit on GET. Added deterministic secondary sort (`id`).

- [x] `POST /api/tasks/[id]/stage` - Update task stage
  - **File**: `src/app/api/tasks/[id]/stage/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskStage.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Route already has: `secureRoute.mutationWithParams`, `checkTaskAccess` with EDITOR role, `parseTaskId`, explicit `select` fields, cache invalidation.

- [x] `GET /api/tasks/[id]/filing-status` - Get filing statuses
  - **File**: `src/app/api/tasks/[id]/filing-status/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/filing-status/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `parseTaskId` validation. Added explicit `select` fields. Added `take: 100` limit. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/filing-status` - Create filing status
  - **File**: `src/app/api/tasks/[id]/filing-status/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/filing-status/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `.strict()` to schema with max lengths. Added `parseTaskId` validation. Added task existence check before create. Added explicit `select` on response. Replaced ad-hoc errors with `AppError`. Added sanitization for referenceNumber field.

- [x] `GET /api/tasks/[id]/search` - Search within task
  - **File**: `src/app/api/tasks/[id]/search/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `parseTaskId` validation. Added `TaskSearchQuerySchema` Zod validation for all query params (q, sources, category, dateFrom, dateTo, limit) with max lengths and enum validation. Added `.max(100)` limit on results. Replaced ad-hoc errors with `AppError`.

### Task Financial Data

- [x] `GET /api/tasks/[id]/balances` - Get task balances
  - **File**: `src/app/api/tasks/[id]/balances/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskBalances.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.ACCESS_TASKS` permission. Replaced `parseInt()` with `parseTaskId()`. Replaced ad-hoc errors with `AppError`. Added `take: 50000` limit on WIP transactions query. Removed unused `tranType` parameter from `categorizeTransaction` function.

- [x] `GET /api/tasks/[id]/wip` - Get task WIP
  - **File**: `src/app/api/tasks/[id]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskWip.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `parseInt()` with `parseTaskId()`. Replaced ad-hoc errors with `AppError`. Added `take: 50000` limit on WIP transactions query. Route already had `Feature.ACCESS_TASKS` permission.

- [x] `GET /api/tasks/[id]/analytics/graphs` - Get task daily transaction metrics
  - **File**: `src/app/api/tasks/[id]/analytics/graphs/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskGraphData.ts`
    - Page: Task overview or analytics page
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: Added Zod validation schema `GraphsQuerySchema` for `resolution` query param with enum allowlist (`high`, `standard`, `low`). Added `Cache-Control: no-store` header for user-specific analytics data. Updated cache key to include resolution parameter for proper cache granularity. Parallelized opening balance and current period transaction queries using `Promise.all()` for better performance. Added comprehensive audit logging with `logger.info()` for both cached and fresh analytics access (userId, taskId, GSTaskID, taskCode, resolution, transactionCount, dateRange). Route already had: `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam` for automatic task access validation, explicit `select` fields, `take: 50000` limits, shared transaction categorization logic, downsampling algorithm, 30-minute Redis caching.

- [x] `GET /api/tasks/[id]/transactions` - Get task transactions
  - **File**: `src/app/api/tasks/[id]/transactions/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTransactions.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `parseInt()` with `parseTaskId()`. Added `TransactionsQuerySchema` Zod validation for query params (page, limit) with proper bounds. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `GET /api/tasks/[id]/trial-balance` - Get trial balance
  - **File**: `src/app/api/tasks/[id]/trial-balance/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/balance-sheet/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Added explicit task existence check with `AppError`. Added deterministic tertiary sort (`id`). Added `take: 5000` limit on mapped accounts query.

### Task Team & Users

- [x] `GET /api/tasks/[id]/users` - List task users
  - **File**: `src/app/api/tasks/[id]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTeam.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take: 500` limit. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/users` - Add user to task
  - **File**: `src/app/api/tasks/[id]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTeam.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Schema validation via secureRoute. Changed `include` to explicit `select` fields. Replaced all ad-hoc error responses with `AppError`. Added explicit `select` on existence checks.

- [x] `GET /api/tasks/[id]/users/[userId]` - Get task user details
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take: 100` limit. Added deterministic tertiary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `PUT /api/tasks/[id]/users/[userId]` - Update task user
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Schema validation via secureRoute. Changed `include` to explicit `select` fields. Added `take: 100` limit. Added `take: 10` on admin users check. Replaced ad-hoc errors with `AppError`.

- [x] `DELETE /api/tasks/[id]/users/[userId]` - Remove user from task
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Changed `include` to explicit `select` fields. Added `take: 10` on admin users check. Added audit logging with `logger.info`. Replaced ad-hoc errors with `AppError`.

- [x] `GET /api/tasks/[id]/users/[userId]/allocations` - Get user allocations
  - **File**: `src/app/api/tasks/[id]/users/[userId]/allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Added `take: 100` limit. Added deterministic tertiary sort (`id`). Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/users/[userId]/allocations` - Create user allocation
  - **File**: `src/app/api/tasks/[id]/users/[userId]/allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Schema validation via secureRoute. Added explicit `select` on existence check. Replaced ad-hoc errors with `AppError`.

- [x] `GET /api/tasks/[id]/users/me` - Get current user's task access
  - **File**: `src/app/api/tasks/[id]/users/me/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useTaskAccess.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Route already had: `secureRoute.queryWithParams`, explicit `select` fields.

- [x] `PUT /api/tasks/[id]/team/[teamMemberId]/allocation` - Update allocation
  - **File**: `src/app/api/tasks/[id]/team/[teamMemberId]/allocation/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Replaced `parseInt()` with `parseNumericId()`. Added `.strict()` to schema. Schema validation via secureRoute. Replaced ad-hoc errors with `AppError`.

- [x] `DELETE /api/tasks/[id]/team/[teamMemberId]/allocation` - Clear allocation
  - **File**: `src/app/api/tasks/[id]/team/[teamMemberId]/allocation/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Replaced `parseInt()` with `parseNumericId()`. Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/team/[teamMemberId]/transfer` - Transfer team member
  - **File**: `src/app/api/tasks/[id]/team/[teamMemberId]/transfer/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Replaced `parseInt()` with `parseNumericId()`. Added `.strict()` to schema. Added `.max(255)` to targetUserId. Schema validation via secureRoute. Replaced ad-hoc errors with `AppError`.

- [x] `GET /api/tasks/[id]/team/allocations` - Get team allocations
  - **File**: `src/app/api/tasks/[id]/team/allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Fixed old params destructure pattern. Added `take` limits (200 for TaskTeam, 1000 for otherAllocations, 500 for employees, 500 for nonClientAllocations). Added deterministic secondary sorts (`id`). Replaced ad-hoc errors with `AppError`.

### Task Acceptance

- [x] `POST /api/tasks/[id]/acceptance` - Approve client acceptance
  - **File**: `src/app/api/tasks/[id]/acceptance/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Replaced all ad-hoc error responses with `AppError`. Route already had: transaction, audit logging.

- [x] `POST /api/tasks/[id]/acceptance/initialize` - Initialize acceptance
  - **File**: `src/app/api/tasks/[id]/acceptance/initialize/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.ACCESS_TASKS` permission with task access check. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take` limits (500 answers, 100 documents). Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`. Schema validation via secureRoute.

- [x] `PATCH /api/tasks/[id]/acceptance/answers` - Save/update answers (autosave)
  - **File**: `src/app/api/tasks/[id]/acceptance/answers/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.ACCESS_TASKS` permission with EDITOR role. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take` limits (200 questions, 500 answers). Added explicit `select` on response query. Replaced ad-hoc errors with `AppError`. Route already had: sanitization, audit logging.
  - **Notes**: Checklist incorrectly listed as GET/POST - this is PATCH.

- [x] `GET /api/tasks/[id]/acceptance/documents` - List acceptance docs
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission with task access check. Replaced `toTaskId()` with `parseTaskId()`. Added `Cache-Control: no-store`. Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/acceptance/documents` - Upload acceptance doc
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.fileUploadWithParams`. Added `Feature.MANAGE_TASKS` permission with EDITOR role. Replaced `toTaskId()` with `parseTaskId()`. Replaced ad-hoc errors with `AppError`. Route already had: MIME type validation, file size validation, filename sanitization, audit logging.

- [x] `DELETE /api/tasks/[id]/acceptance/documents` - Delete doc (via query param)
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission with EDITOR role. Added `DeleteDocumentQuerySchema` Zod validation for query params. Replaced `Number.parseInt()` with `parseNumericId()`. Replaced ad-hoc errors with `AppError`. Route already had: audit logging.
  - **Notes**: Checklist incorrectly listed DELETE at `[documentId]` route - DELETE is on documents route with query param.

- [x] `GET /api/tasks/[id]/acceptance/documents/[documentId]` - Download doc
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/[documentId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Replaced ad-hoc errors with `AppError`. Changed `Cache-Control` from `private, max-age=3600` to `no-store` for sensitive documents. Added `X-Content-Type-Options: nosniff` security header. Route already had: audit logging.

- [x] `GET /api/tasks/[id]/acceptance/status` - Get acceptance status
  - **File**: `src/app/api/tasks/[id]/acceptance/status/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission with task access check. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take: 500` limit on answers. Added `Cache-Control: no-store`. Replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/acceptance/submit` - Submit for approval
  - **File**: `src/app/api/tasks/[id]/acceptance/submit/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` permission with EDITOR role. Replaced `toTaskId()` with `parseTaskId()`. Changed `include` to explicit `select` fields. Added `take: 500` limit on answers. Added explicit `select` on update response. Replaced ad-hoc errors with `AppError` with proper error codes.

- [x] `GET /api/tasks/[id]/permissions/approve-acceptance` - Check approval permission
  - **File**: `src/app/api/tasks/[id]/permissions/approve-acceptance/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission with task access check. Replaced `toTaskId()` with `parseTaskId()`. Added `Cache-Control: no-store`. Replaced ad-hoc errors with `AppError`.
  - **Notes**: Checklist incorrectly listed as POST - this is GET.

### Task Tax & Compliance

- [x] `GET /api/tasks/[id]/tax-calculation` - Get tax calculation
  - **File**: `src/app/api/tasks/[id]/tax-calculation/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/tax-calculation/hooks/useTaxCalculation.ts`
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission with task access check. Replaced `toTaskId()` with `parseTaskId()`.
  - **Notes**: Checklist incorrectly listed POST - only GET exists. Tax calculation is read from mapped accounts, not created via POST.

- [x] `GET /api/tasks/[id]/tax-calculation/export` - Export tax calc
  - **File**: `src/app/api/tasks/[id]/tax-calculation/export/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Added format parameter validation against allowlist (`excel`, `pdf`, `csv`). Uses `AppError` for invalid format.

- [x] `GET /api/tasks/[id]/tax-adjustments` - List tax adjustments
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` permission. Replaced `toTaskId()` with `parseTaskId()`. Added Zod validation for `status` query param with allowlist. Replaced ad-hoc error responses with `AppError`.

- [x] `POST /api/tasks/[id]/tax-adjustments` - Create adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/new/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added `CreateTaxAdjustmentSchema` with `.strict()` for mass assignment protection. Explicit field mapping to handler.

- [x] `DELETE /api/tasks/[id]/tax-adjustments` - Delete all adjustments
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/route.ts`
  - **Frontend**: N/A (admin action)
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with ADMIN role. Added status query param validation. Replaced ad-hoc error responses with `AppError`.

- [x] `GET /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Get adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS`. Added IDOR protection via `verifyAdjustmentBelongsToTask()`. Replaced `include` with explicit `select` fields.

- [x] `PATCH /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Update adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `UpdateTaxAdjustmentSchema` with `.strict()`. Added IDOR protection. Role-based authorization (REVIEWER for approve/reject, EDITOR for other edits). Replaced `include` with explicit `select`.
  - **Notes**: Checklist incorrectly listed as PUT - actual method is PATCH.

- [x] `DELETE /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Delete
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added IDOR protection. Uses `prisma.$transaction` for atomic delete of documents and adjustment.

- [x] `GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/documents` - List docs
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS`. Added IDOR protection. Added explicit `select` fields. Added `take: 100` limit. Added deterministic secondary sort (`id`). Uses `successResponse` wrapper.

- [x] `POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/documents` - Upload doc
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.fileUploadWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added IDOR protection. Replaced `Number.parseInt` with `parseTaskId`/`parseAdjustmentId`. Uses `AppError` for validation errors. Added explicit `select` on create response.
  - **Notes**: Route already had file size and MIME type validation.

- [x] `POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract` - Extract data
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/extract/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added IDOR protection for both adjustment and document. Replaced `Number.parseInt` with proper ID parsers. Added `.strict()` to schema. Uses `AppError` for errors.

- [x] `GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract` - Extraction status
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/extract/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS`. Added IDOR protection. Added `take: 100` limit. Added deterministic secondary sort.

- [x] `GET /api/tasks/[id]/tax-adjustments/suggestions` - Get AI suggestions
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/suggestions/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS`. Replaced `toTaskId()` with `parseTaskId()`. Added `take: 100` limit. Added explicit `select` fields. Added deterministic secondary sort.

- [x] `POST /api/tasks/[id]/tax-adjustments/suggestions` - Generate suggestions
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/suggestions/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.aiWithParams` (AI rate limiting). Added `Feature.MANAGE_TASKS` with EDITOR role. Added `.strict()` to schema. Added `MAX_MAPPED_ACCOUNTS` limit (500). Uses `$transaction` with `createMany` for efficiency. Uses `AppError` for errors.

- [x] `GET /api/tasks/[id]/compliance-checklist` - Get checklist
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_TASKS` with task access check. Replaced `Number.parseInt` with `parseTaskId()`. Fixed old `{ params }` signature to Promise pattern. Added explicit `select` fields. Added `take: 500` limit. Added deterministic secondary sort (`id`).

- [x] `POST /api/tasks/[id]/compliance-checklist` - Create checklist item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added `CreateChecklistItemSchema` with `.strict()` for mass assignment protection. Explicit field mapping in Prisma `data`. Added explicit `select` on response.

- [x] `PUT /api/tasks/[id]/compliance-checklist/[itemId]` - Update item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/[itemId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Converted to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_TASKS` with EDITOR role. Added `UpdateChecklistItemSchema` with `.strict()`. Replaced `Number.parseInt` with `parseNumericId()`. Added IDOR protection via `verifyChecklistItemBelongsToTask()`. Explicit field mapping. Added explicit `select`.

- [x] `DELETE /api/tasks/[id]/compliance-checklist/[itemId]` - Delete item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/[itemId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added DELETE handler (was missing). Uses `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS` and EDITOR role. Added IDOR protection.

- [x] `GET /api/tasks/[id]/compliance-checklist/[itemId]` - Get single item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/[itemId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Added GET handler for completeness. Uses `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`. Added IDOR protection.

### Task Documents & Workspace

- [x] `GET /api/tasks/[id]/administration-documents` - List admin docs
  - **File**: `src/app/api/tasks/[id]/administration-documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`. Added explicit `select` fields, `take: 500` limit, `Cache-Control: no-store` header, and `parseTaskId()` utility.

- [x] `POST /api/tasks/[id]/administration-documents` - Create admin doc
  - **File**: `src/app/api/tasks/[id]/administration-documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`. Added `.strict()` to Zod schema, explicit `select` fields on create. Uses sanitization utilities.

- [x] `GET /api/tasks/[id]/workspace/files` - List workspace files
  - **File**: `src/app/api/tasks/[id]/workspace/files/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_WORKSPACE`. Added Zod query param validation for `folderId`, replaced `any` type with `Prisma.WorkspaceFileWhereInput`, added `take: 500` limit, `Cache-Control: no-store` header.

- [x] `POST /api/tasks/[id]/workspace/files` - Upload file
  - **File**: `src/app/api/tasks/[id]/workspace/files/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.fileUploadWithParams` with `Feature.MANAGE_WORKSPACE_FILES`. Replaced `any` types with `unknown`, replaced ad-hoc error responses with `AppError`. Uses `parseTaskId()` and `parseNumericId()` utilities.

- [x] `GET /api/tasks/[id]/workspace/files/[fileId]` - Download file
  - **File**: `src/app/api/tasks/[id]/workspace/files/[fileId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_WORKSPACE`. Added `X-Content-Type-Options: nosniff` and `Cache-Control: no-store` headers. Uses `parseTaskId()` and `parseNumericId()` utilities. IDOR protection via task ownership check.

- [x] `DELETE /api/tasks/[id]/workspace/files/[fileId]` - Delete file
  - **File**: `src/app/api/tasks/[id]/workspace/files/[fileId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams` with `Feature.DELETE_WORKSPACE_FILES`. Uses `parseTaskId()` and `parseNumericId()` utilities. IDOR protection via task ownership check. AppError for consistent error handling.

- [x] `GET /api/tasks/[id]/workspace/folders` - List folders
  - **File**: `src/app/api/tasks/[id]/workspace/folders/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_WORKSPACE`. Added `take: 500` limit, `Cache-Control: no-store` header. Uses `parseTaskId()` utility. Already had explicit `select`.

- [x] `POST /api/tasks/[id]/workspace/folders` - Create folder
  - **File**: `src/app/api/tasks/[id]/workspace/folders/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_WORKSPACE_FOLDERS`. Added `.strict()` to Zod schema. Uses `parseTaskId()` and `parseNumericId()` utilities. Explicit field mapping prevents mass assignment. IDOR protection for parent folder.

### Task Mapped Accounts

- [x] `GET /api/tasks/[id]/mapped-accounts` - List mapped accounts
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`. Added `parseTaskId()` utility. Added explicit `select` fields. Added `take: 1000` limit with deterministic ordering (section, subsection, accountCode). Added `Cache-Control: no-store` header. Added logging.

- [x] `POST /api/tasks/[id]/mapped-accounts` - Create mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`. Added Zod schema with `.strict()` for mass assignment protection. Replaced `...data` spread with explicit field mapping. Added explicit `select` fields. Added logging.

- [x] `PATCH /api/tasks/[id]/mapped-accounts/[accountId]` - Update mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/[accountId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`. Added authentication and authorization (was missing!). Added Zod schema with `.strict()`. Replaced inline `parseInt` with `parseTaskId()` and `parseNumericId()` utilities. Added IDOR protection (verify account belongs to task). Replaced `data` spread with explicit field mapping. Added explicit `select` fields. Added `successResponse` wrapper. Added logging.
  - **Note**: Checklist listed as PUT but route was PATCH - corrected to match actual implementation.

- [x] `DELETE /api/tasks/[id]/mapped-accounts/[accountId]` - Delete mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/[accountId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Handler was missing - created new DELETE handler using `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`. Uses `parseTaskId()` and `parseNumericId()` utilities. Added IDOR protection. Added logging.

### Task Opinion Drafts

- [x] `GET /api/tasks/[id]/opinion-drafts` - List drafts
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useOpinionDrafts.ts`
    - Component: `src/components/tools/tax-opinion/index.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS` and `taskIdParam: 'id'` for automatic task access validation. Added explicit `select` fields, deterministic ordering (`updatedAt desc`, `id desc`), `take: 100` limit, `parseTaskId()`, `successResponse`, `Cache-Control: no-store` header, and audit logging. Rate limiting built-in via secureRoute.

- [x] `POST /api/tasks/[id]/opinion-drafts` - Create draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftOperations.ts`
    - Component: `src/components/tools/tax-opinion/index.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam` for task access validation, `CreateOpinionDraftSchema` with `.strict()` for input validation and mass assignment protection. Explicit field mapping (no data spread), explicit `select` on response, audit logging with userId/taskId/draftId. Rate limiting built-in via secureRoute.

- [x] `GET /api/tasks/[id]/opinion-drafts/[draftId]` - Get draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useOpinionDrafts.ts`
    - Component: `src/components/tools/tax-opinion/components/OpinionPreview.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **CREATED** - Added missing GET handler using `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, IDOR protection via `verifyDraftBelongsToTask()` helper, explicit `select` fields, `parseTaskId()`, `parseNumericId()`, `successResponse`, `Cache-Control: no-store`, `AppError` for consistent error handling.

- [x] `PUT /api/tasks/[id]/opinion-drafts/[draftId]` - Update draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useOpinionDrafts.ts`
    - Component: `src/components/tools/tax-opinion/components/SectionEditor.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, `UpdateOpinionDraftSchema` with `.strict()`. Added **IDOR protection** via `verifyDraftBelongsToTask()` helper function that validates draft belongs to the task before update. Explicit field mapping (no data spread), explicit `select` on response, audit logging with updated fields tracked.

- [x] `DELETE /api/tasks/[id]/opinion-drafts/[draftId]` - Delete draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftOperations.ts`
    - Component: `src/components/tools/tax-opinion/index.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added **IDOR protection** via `verifyDraftBelongsToTask()`. Uses `parseTaskId()`, `parseNumericId()`, audit logging, `successResponse`.

- [x] `GET /api/tasks/[id]/opinion-drafts/[draftId]/chat` - Get chat history
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/chat/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`. Added **IDOR protection** via `verifyDraftBelongsToTask()`. Added explicit `select` fields, `take: 100` limit, deterministic ordering (`createdAt asc`, `id asc`), `parseTaskId()`, `parseNumericId()`, `successResponse`, `Cache-Control: no-store` header.

- [x] `POST /api/tasks/[id]/opinion-drafts/[draftId]/chat` - AI chat
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/chat/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.aiWithParams` with **strict AI rate limiting** built-in. Added `Feature.MANAGE_TASKS`, `taskIdParam`, **IDOR protection** via `verifyDraftBelongsToTask()`, `OpinionChatMessageSchema` with `.strict()` and `.max(2000)` on message length. Moved dynamic import to top-level (performance fix). Added explicit `select` fields on all Prisma queries, audit logging with userId/taskId/draftId/isDocumentQuery/sourcesFound. Proper error handling with detailed messages for RAG unavailability.

- [x] `GET /api/tasks/[id]/opinion-drafts/[draftId]/documents` - List draft documents
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/documents/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/DocumentManager.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS` and `taskIdParam` for automatic task access validation. Added IDOR protection via `verifyDraftBelongsToTask()` helper. Added explicit `select` fields, deterministic ordering (`createdAt desc`, `id desc`), `take: 100` limit, `parseTaskId()`, `parseNumericId()`, `successResponse`, `Cache-Control: no-store` header, and audit logging. Supports RAG indexing status.

- [x] `POST /api/tasks/[id]/opinion-drafts/[draftId]/documents` - Upload document
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/documents/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/DocumentManager.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.fileUploadWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added **file size validation** (50MB max), MIME type allowlist (PDF, Word, text), IDOR protection via `verifyDraftBelongsToTask()`. Explicit field mapping (no data spread), explicit `select` on response. Integrates with RAG for async indexing with proper error handling. Comprehensive audit logging with userId/taskId/draftId/documentId.

- [x] `DELETE /api/tasks/[id]/opinion-drafts/[draftId]/documents` - Delete document
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/documents/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/DocumentManager.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added query parameter validation for documentId, `parseTaskId()`, `parseNumericId()`. Added **IDOR protection** - verifies draft belongs to task AND document belongs to draft. Explicit `select` fields. Deletes from blob storage and vector index with graceful error handling. Audit logging.

- [x] `POST /api/tasks/[id]/opinion-drafts/[draftId]/export` - Export draft (PDF/DOCX)
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/export/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/OpinionPreview.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, `ExportOpinionSchema` for format validation (PDF/DOCX enum with default). Added IDOR protection, `parseTaskId()`, `parseNumericId()`, explicit `select` fields on all Prisma queries. Added filename sanitization to prevent path traversal, `X-Content-Type-Options: nosniff` header. Audit logging. Validates sections exist before export.

- [x] `GET /api/tasks/[id]/opinion-drafts/[draftId]/sections` - List sections
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/SectionEditor.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`. Added IDOR protection, explicit `select` fields, deterministic ordering (`order asc`, `id asc`), `take: 100` limit, `parseTaskId()`, `parseNumericId()`, `successResponse`, `Cache-Control: no-store` header, audit logging.

- [x] `POST /api/tasks/[id]/opinion-drafts/[draftId]/sections` - Add/generate section
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/SectionEditor.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added **individual Zod schemas** for all 6 actions: `StartSectionSchema`, `AnswerQuestionSchema`, `GenerateContentSchema`, `RegenerateSchema`, `CreateManualSectionSchema`, `RefreshContextSchema`. Added IDOR protection for all operations, explicit field mapping (no data spread), explicit `select` on all Prisma queries. For `upload_document_for_section` action: added file size validation (50MB max), MIME type allowlist, proper RAG indexing. Comprehensive audit logging for all actions. Uses `AppError` for consistent error handling.

- [x] `PUT /api/tasks/[id]/opinion-drafts/[draftId]/sections` - Update/reorder sections
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/SectionEditor.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added **dual Zod schemas**: `ReorderSectionsSchema` for batch reorder, `UpdateSingleSectionSchema` for single updates. Added IDOR protection for both operations (verifies all sections belong to draft). Replaced mass assignment spread with explicit field mapping. Uses transaction for batch reorder. Explicit `select` on response. Audit logging with fieldsUpdated tracking.

- [x] `DELETE /api/tasks/[id]/opinion-drafts/[draftId]/sections` - Delete section
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/SectionEditor.tsx`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **FIXED** - Migrated to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Added query parameter validation for sectionId, `parseTaskId()`, `parseNumericId()`. Added **IDOR protection** - verifies section belongs to draft. Explicit `select` fields. Audit logging with section title. Uses `AppError` for consistent error handling.

### Task Review Notebook

- [x] `GET /api/tasks/[id]/review-notes` - List review notes
  - **File**: `src/app/api/tasks/[id]/review-notes/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNotes.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteList.tsx`
  - **Reviewed**: 2024-12-23
  - **Notes**: Already uses `secureRoute.queryWithParams` with taskIdParam. Added Zod validation for query params.

- [x] `POST /api/tasks/[id]/review-notes` - Create review note
  - **File**: `src/app/api/tasks/[id]/review-notes/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/CreateReviewNoteModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Notes**: Already uses `secureRoute.mutationWithParams` with schema. Sends notifications on assignment.

- [x] `GET /api/tasks/[id]/review-notes/[noteId]` - Get review note details
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNotes.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, `parseNumericId()`, IDOR protection, `Cache-Control: no-store`.

- [x] `PUT /api/tasks/[id]/review-notes/[noteId]` - Update review note
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`.

- [x] `DELETE /api/tasks/[id]/review-notes/[noteId]` - Delete review note
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteList.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`.

- [x] `POST /api/tasks/[id]/review-notes/[noteId]/status` - Change review note status
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/status/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`. Sends notifications on status change.

- [x] `POST /api/tasks/[id]/review-notes/[noteId]/assign` - Assign review note
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/assign/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`. Sends notification to assignee.

- [x] `GET /api/tasks/[id]/review-notes/[noteId]/assignees` - List assignees
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/assignees/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **ENHANCED** - Already used `secureRoute.queryWithParams` with `taskIdParam`, `Feature.ACCESS_TASKS`, IDOR protection, explicit select fields, and deterministic ordering. Added `take: 50` limit for performance, audit logging, and `Cache-Control: no-store` header. Supports multi-assignee workflow.

- [x] `POST /api/tasks/[id]/review-notes/[noteId]/assignees` - Add assignee
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/assignees/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **ENHANCED** - Already used `secureRoute.mutationWithParams` with `taskIdParam`, `Feature.MANAGE_TASKS`, `AddAssigneeSchema` with `.strict()`, IDOR protection, explicit select fields. Wrapped assignee creation, comment creation (for forwards), and backward-compatible `assignedTo` update in **transaction for atomicity**. Added audit logging. Prevents duplicate assignments with user-friendly error. Supports forwarding with `isForwarded` flag and creates system comment.

- [x] `DELETE /api/tasks/[id]/review-notes/[noteId]/assignees` - Remove assignee
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/assignees/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteActions.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: ✅ **ENHANCED** - Already used `secureRoute.mutationWithParams` with `taskIdParam`, `Feature.MANAGE_TASKS`, `RemoveAssigneeSchema` with `.strict()`, IDOR protection. Wrapped deletion and backward-compatible `assignedTo` update in **transaction for atomicity**. Added audit logging. Prevents removal of last assignee (business rule: must have at least one).

- [x] `GET /api/tasks/[id]/review-notes/[noteId]/attachments` - List attachments
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/attachments/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteAttachments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, `parseNumericId()`, IDOR protection, `take: 100` limit, deterministic sort, `Cache-Control: no-store`.

- [x] `POST /api/tasks/[id]/review-notes/[noteId]/attachments` - Upload attachment
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/attachments/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteAttachments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Migrated to `secureRoute.fileUploadWithParams`, added `Feature.MANAGE_TASKS`, `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`. File validation (size 10MB, MIME allowlist).

- [x] `GET /api/tasks/[id]/review-notes/[noteId]/attachments/[attachmentId]` - Download attachment
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/attachments/[attachmentId]/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteAttachments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, `parseNumericId()` for both noteId and attachmentId, IDOR protection, `Cache-Control: no-store`, replaced ad-hoc errors with `AppError`. Supports both blob storage and local filesystem.

- [x] `DELETE /api/tasks/[id]/review-notes/[noteId]/attachments/[attachmentId]` - Delete attachment
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/attachments/[attachmentId]/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteAttachments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, business logic authorization (only uploader or raiser can delete), replaced ad-hoc errors with `AppError`. Audit logging included.

- [x] `GET /api/tasks/[id]/review-notes/[noteId]/comments` - List comments
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/comments/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteComments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, `parseNumericId()`, IDOR protection, `take: 500` limit, deterministic sort, `Cache-Control: no-store`. Filters internal comments based on user role.

- [x] `POST /api/tasks/[id]/review-notes/[noteId]/comments` - Add comment
  - **File**: `src/app/api/tasks/[id]/review-notes/[noteId]/comments/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNoteComments.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteDetailModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `parseNumericId()`, IDOR protection, replaced ad-hoc errors with `AppError`. Sends notification for non-internal comments.

- [x] `GET /api/tasks/[id]/review-notes/analytics` - Get analytics
  - **File**: `src/app/api/tasks/[id]/review-notes/analytics/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNotes.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/ReviewNoteAnalytics.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, `Cache-Control: no-store`.

- [x] `GET /api/tasks/[id]/review-notes/categories` - List categories
  - **File**: `src/app/api/tasks/[id]/review-notes/categories/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/ReviewNotebookTool/hooks/useReviewNotes.ts`
    - Component: `src/components/tools/ReviewNotebookTool/components/CreateReviewNoteModal.tsx`
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.ACCESS_TASKS`, fixed `any` type to `Prisma.ReviewCategoryWhereInput`, `take: 100` limit, deterministic sort, `Cache-Control: private, max-age=300`.

- [x] `POST /api/tasks/[id]/review-notes/categories` - Create category
  - **File**: `src/app/api/tasks/[id]/review-notes/categories/route.ts`
  - **Frontend**: 
    - Component: Admin category management (PARTNER+ only)
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Added `Feature.MANAGE_TASKS`, replaced ad-hoc error with `AppError`. Business logic authorization for PARTNER+ only.

- [x] `PUT /api/tasks/[id]/review-notes/categories/[categoryId]` - Update category
  - **File**: `src/app/api/tasks/[id]/review-notes/categories/[categoryId]/route.ts`
  - **Frontend**: 
    - Component: Admin category management (PARTNER+ only)
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams`, added `Feature.MANAGE_TASKS`, `parseNumericId()`, replaced ad-hoc errors with `AppError`. Business logic authorization for PARTNER+ only.

- [x] `DELETE /api/tasks/[id]/review-notes/categories/[categoryId]` - Deactivate category
  - **File**: `src/app/api/tasks/[id]/review-notes/categories/[categoryId]/route.ts`
  - **Frontend**: 
    - Component: Admin category management (PARTNER+ only)
  - **Reviewed**: 2024-12-23
  - **Fix Applied**: Migrated to `secureRoute.mutationWithParams`, added `Feature.MANAGE_TASKS`, `parseNumericId()`, replaced ad-hoc errors with `AppError`. Soft delete (deactivate). Business logic authorization for PARTNER+ only.

### Task Research & AI

- [ ] `GET /api/tasks/[id]/research-notes` - List research notes
  - **File**: `src/app/api/tasks/[id]/research-notes/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for research context
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Route exists with GET/POST handlers. Uses raw handler pattern (not secureRoute). Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `take` limits, deterministic ordering, `Cache-Control: no-store` header.

- [ ] `POST /api/tasks/[id]/research-notes` - Create research note
  - **File**: `src/app/api/tasks/[id]/research-notes/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for research context
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with manual auth. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, schema already has `.strict()`. Needs explicit `select` on create response, `AppError` for validation errors.

- [ ] `PUT /api/tasks/[id]/research-notes/[noteId]` - Update note
  - **File**: `src/app/api/tasks/[id]/research-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for research context
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, IDOR protection (verify note belongs to task), `parseNumericId()` for noteId, explicit `select` on update response.

- [ ] `DELETE /api/tasks/[id]/research-notes/[noteId]` - Delete note
  - **File**: `src/app/api/tasks/[id]/research-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for research context
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, IDOR protection, audit logging, `parseNumericId()`.

- [ ] `GET /api/tasks/[id]/ai-tax-report` - Get latest AI tax report
  - **File**: `src/app/api/tasks/[id]/ai-tax-report/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/AITaxReport.tsx`
    - Page: `src/app/dashboard/tasks/[id]/reporting/page.tsx`
    - Component: `src/components/pdf/ReportingPackPDF.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with `enforceRateLimit`. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, `Cache-Control: no-store` header.

- [ ] `POST /api/tasks/[id]/ai-tax-report` - Generate AI tax report
  - **File**: `src/app/api/tasks/[id]/ai-tax-report/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/AITaxReport.tsx`
    - Page: `src/app/dashboard/tasks/[id]/reporting/page.tsx`
    - Component: `src/components/pdf/ReportingPackPDF.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with `enforceRateLimit`. Needs migration to `secureRoute.aiWithParams` (AI rate limiting) with `Feature.MANAGE_TASKS`, `taskIdParam`, Zod schema, IDOR protection. maxDuration set to 90 seconds.

- [ ] `GET /api/tasks/[id]/legal-precedents` - List legal precedents
  - **File**: `src/app/api/tasks/[id]/legal-precedents/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for legal research
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `take` limits, deterministic ordering, `parseTaskId()` instead of parseInt.

- [ ] `POST /api/tasks/[id]/legal-precedents` - Create legal precedent
  - **File**: `src/app/api/tasks/[id]/legal-precedents/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/tax-opinion/components/ChatInterface.tsx`
    - Used in Tax Opinion Tool for legal research
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with manual body parsing. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, Zod schema with `.strict()`, explicit `select` on create, `parseTaskId()`.

- [ ] `GET /api/tasks/[id]/sars-responses` - List SARS responses
  - **File**: `src/app/api/tasks/[id]/sars-responses/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/TaxComplianceTool/index.tsx`
    - Page: `src/app/dashboard/tasks/[id]/sars-responses/page.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `take` limits, deterministic ordering, `Cache-Control: no-store` header.

- [ ] `POST /api/tasks/[id]/sars-responses` - Create SARS response
  - **File**: `src/app/api/tasks/[id]/sars-responses/route.ts`
  - **Frontend**: 
    - Component: `src/components/tools/TaxComplianceTool/index.tsx`
    - Page: `src/app/dashboard/tasks/[id]/sars-responses/page.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with manual body parsing. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, schema already has `.strict()`, explicit `select` on create, `AppError` for validation errors.

### Task Engagement Letters

- [ ] `GET /api/tasks/[id]/engagement-letter` - Get engagement letter status
  - **File**: `src/app/api/tasks/[id]/engagement-letter/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Component: `src/components/features/tasks/TaskDetail/TaskDetailContent.tsx`
    - Component: `src/components/features/clients/ClientDocuments.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `Cache-Control: no-store` header.

- [ ] `POST /api/tasks/[id]/engagement-letter` - Upload engagement letter
  - **File**: `src/app/api/tasks/[id]/engagement-letter/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Component: `src/components/features/tasks/TaskDetail/TaskDetailContent.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with manual formData parsing and file validation. Needs migration to `secureRoute.fileUploadWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Business logic authorization via `canApproveEngagementLetter()`. File type validation (PDF/DOCX) already in place. Requires client task and approved acceptance. Cache invalidation in place.

- [ ] `POST /api/tasks/[id]/engagement-letter/generate` - Generate letter from template
  - **File**: `src/app/api/tasks/[id]/engagement-letter/generate/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Component: `src/components/features/tasks/TaskDetail/TaskDetailContent.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.mutationWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`, Zod schema with `.strict()` for request body (templateId, useAiAdaptation). Business logic authorization via `canApproveEngagementLetter()`. Uses template generation service. Requires client task and approved acceptance.

- [ ] `GET /api/tasks/[id]/engagement-letter/download` - Download letter
  - **File**: `src/app/api/tasks/[id]/engagement-letter/download/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Component: `src/components/features/clients/ClientDocuments.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, IDOR protection. Returns PDF/DOCX file. Needs `X-Content-Type-Options: nosniff` header, `Cache-Control: no-store` header. File path validation needed to prevent path traversal.

### Task Data Processing Agreement (DPA)

- [ ] `GET /api/tasks/[id]/dpa` - Get DPA status
  - **File**: `src/app/api/tasks/[id]/dpa/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `Cache-Control: no-store` header.

- [ ] `POST /api/tasks/[id]/dpa` - Upload DPA
  - **File**: `src/app/api/tasks/[id]/dpa/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler with manual formData parsing and file validation. Needs migration to `secureRoute.fileUploadWithParams` with `Feature.MANAGE_TASKS`, `taskIdParam`. Business logic authorization via `canApproveEngagementLetter()`. File type validation (PDF/DOCX) already in place. Requires client task, approved acceptance, and uploaded engagement letter. Cache invalidation in place.

- [ ] `GET /api/tasks/[id]/dpa/download` - Download DPA
  - **File**: `src/app/api/tasks/[id]/dpa/download/route.ts`
  - **Frontend**: 
    - Component: `src/components/features/tasks/EngagementLetterTab.tsx`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, IDOR protection. Returns PDF/DOCX file. Needs `X-Content-Type-Options: nosniff` header, `Cache-Control: no-store` header. File path validation needed to prevent path traversal.

### Task Reporting & Notifications

- [x] `GET /api/tasks/[id]/reporting/export` - Export report
  - **File**: `src/app/api/tasks/[id]/reporting/route.ts` *(DOES NOT EXIST)*
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/reporting/page.tsx`
    - Component: `src/components/pdf/ReportingPackPDF.tsx`
  - **Reviewed**: 2024-12-26
  - **Notes**: ⏸️ **NOT IMPLEMENTED** - The `/api/tasks/[id]/reporting/` folder does not exist. When implemented, should use `secureRoute.queryWithParams` or `secureRoute.mutationWithParams` (if POST) with `taskIdParam` and `Feature.ACCESS_TASKS`, IDOR protection. Should export comprehensive reporting pack (financial statements, notes, adjustments). Should support PDF format and add `X-Content-Type-Options: nosniff` header.

- [ ] `GET /api/tasks/[id]/notification-preferences` - Get task-specific preferences
  - **File**: `src/app/api/tasks/[id]/notification-preferences/route.ts`
  - **Frontend**: 
    - API endpoint for task-specific notification settings
    - Used for configuring per-task email notifications
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.queryWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, explicit `select` fields, `take` limits, deterministic ordering, `Cache-Control: no-store` header. IDOR protection already in place (filters by userId and taskId).

- [ ] `PUT /api/tasks/[id]/notification-preferences` - Update task-specific preferences
  - **File**: `src/app/api/tasks/[id]/notification-preferences/route.ts`
  - **Frontend**: 
    - API endpoint for task-specific notification settings
    - Used for configuring per-task email notifications
  - **Reviewed**: Not yet reviewed
  - **Notes**: ✅ **IMPLEMENTED** - Uses raw handler. Needs migration to `secureRoute.mutationWithParams` with `Feature.ACCESS_TASKS`, `taskIdParam`, schema already exists (`UpdateNotificationPreferenceSchema`), IDOR protection in place. Uses upsert pattern. Needs `AppError` for validation errors.

---

## Service Line Routes (12)

- [x] `GET /api/service-lines` - List service lines
  - **File**: `src/app/api/service-lines/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useServiceLines.ts`
    - Page: `src/app/dashboard/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.ACCESS_DASHBOARD` permission check.

- [x] `GET /api/service-lines/user-role` - Get user's service line role
  - **File**: `src/app/api/service-lines/user-role/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useServiceLineAccess.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation for query params. Added IDOR protection (users can only query roles for sub-groups they have access to, or their own role). Added `Feature.ACCESS_DASHBOARD` permission. Fixed employee ID parsing validation. Replaced ad-hoc error responses with AppError.

- [x] `GET /api/service-lines/[serviceLine]` - Get service line stats
  - **File**: `src/app/api/service-lines/[serviceLine]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added `Feature.ACCESS_DASHBOARD` permission. Replaced ad-hoc error responses with AppError throws.

- [x] `GET /api/service-lines/[serviceLine]/sub-groups` - List sub-groups
  - **File**: `src/app/api/service-lines/[serviceLine]/sub-groups/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useSubServiceLineGroups.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation with `isValidServiceLine()`. Added service line access check. Removed unused `cache` and `CACHE_PREFIXES` imports. Removed trailing blank lines.

- [x] `GET /api/service-lines/[serviceLine]/external-lines` - External lines
  - **File**: `src/app/api/service-lines/[serviceLine]/external-lines/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation with `isValidServiceLine()`. Added service line access check with `checkServiceLineAccess()`. Removed trailing blank lines.

- [x] `GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/users` - Users
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useSubServiceLineUsers.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()`. Fixed `any` type usage by defining proper `SubGroupInfo` interface. Replaced `handleApiError` catch with secureRoute error handling. Added proper Feature permission.

- [x] `GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines`
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation. Added both service line and sub-service line group access checks. Removed trailing blank lines.

### Planner Routes

- [x] `GET /api/service-lines/[sL]/[sSLG]/planner/clients` - Planner clients
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useClientPlanner.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Added Zod validation for query params (page, limit, filter arrays with max limit 100). Defined proper TypeScript interfaces (`SubGroupInfo`, `ClientPlannerResponse`, `TaskRow`, `AllocationRow`) to replace `any` types. Replaced `handleApiError` catch with AppError throws. Removed unused perf tracking variables.

- [x] `GET /api/service-lines/[sL]/[sSLG]/planner/clients/filters` - Filters
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useClientPlannerFilters.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Defined proper TypeScript interfaces (`SubGroupInfo`, `ClientPlannerFiltersResponse`, `FilterOption`) to replace `any` types. Replaced `handleApiError` catch with AppError throws. Removed unused `queryStart` perf variable. Removed trailing blank lines.

- [x] `GET /api/service-lines/[sL]/[sSLG]/planner/employees` - Planner employees
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useEmployeePlanner.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Added Zod validation for query params (page, limit max 100, includeUnallocated, filter arrays). Defined proper TypeScript interfaces (`SubGroupInfo`, `EmployeePlannerResponse`, `AllocationRow`, `ServiceLineEmployee`, `TaskTeamWhereInput`) to replace `any` types. Replaced `role: 'VIEWER' as any` with `ServiceLineRole.VIEWER`. Replaced `handleApiError` catch with AppError throws. Removed unused perf tracking variables.

- [x] `GET /api/service-lines/[sL]/[sSLG]/planner/employees/filters` - Filters
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useEmployeePlannerFilters.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Defined proper TypeScript interfaces (`SubGroupInfo`, `EmployeePlannerFiltersResponse`, `FilterOption`) to replace `any` types. Removed unused `mapUsersToEmployees` import. Replaced `handleApiError` catch with AppError throws. Removed unused `queryStart` perf variable.

### User Accessible Groups

- [ ] `GET /api/service-lines/user-accessible-groups` - Get user's accessible sub-groups
  - **File**: `src/app/api/service-lines/user-accessible-groups/route.ts`
  - **Frontend**: 
    - Used for dashboard navigation and service line selection
  - **Reviewed**: Not yet reviewed
  - **Notes**: Route exists and is implemented. Uses `secureRoute.query` with `Feature.ACCESS_DASHBOARD`. Needs security review for IDOR protection, performance review for query optimization (includes employee lookup and task counting), and input validation review.

---

## Group Routes (6)

- [x] `GET /api/groups` - List groups with pagination
  - **File**: `src/app/api/groups/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientGroups.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Moved `checkFeature` to `secureRoute.query({ feature: Feature.ACCESS_CLIENTS })`. Added secondary sort (`groupCode`) for deterministic pagination. Removed unused imports (`checkFeature`, `Feature`, `getUserSubServiceLineGroups`).

- [x] `GET /api/groups/filters` - Get group filter options
  - **File**: `src/app/api/groups/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupFilters.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Moved `checkFeature` to `secureRoute.query({ feature: Feature.ACCESS_CLIENTS })`. Added secondary sort (`groupCode`) for deterministic pagination. Removed unused imports (`checkFeature`, `Feature`, `getUserSubServiceLineGroups`).

- [x] `GET /api/groups/[groupCode]` - Get group details
  - **File**: `src/app/api/groups/[groupCode]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientGroup.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod schema validation for query params (`search`, `page`, `limit`, `type`, `serviceLine`) with allowlist for `type`. Replaced ad-hoc error responses with `AppError`. Added secondary sort (`id`) for deterministic pagination on tasks and clients queries.

- [x] `GET /api/groups/[groupCode]/debtors` - Get group debtors
  - **File**: `src/app/api/groups/[groupCode]/debtors/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupDebtors.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated from raw handler to `secureRoute.queryWithParams` with `Feature.VIEW_WIP_DATA`. Replaced ad-hoc error responses with `AppError`. Added `take` limits: clients (1000), debtorTransactions (50000), serviceLineExternals (1000), masterServiceLines (100). Removed manual auth/permission checks and try-catch.

- [x] `GET /api/groups/[groupCode]/wip` - Get group WIP
  - **File**: `src/app/api/groups/[groupCode]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupWip.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated from raw handler to `secureRoute.queryWithParams` with `Feature.VIEW_WIP_DATA`. Replaced ad-hoc error responses with `AppError`. Added `take` limits: clients (1000), wipTransactions (100000), masterServiceLines (100). Removed manual auth/permission checks and try-catch.

- [x] `GET /api/groups/[groupCode]/service-lines` - Get group service lines
  - **File**: `src/app/api/groups/[groupCode]/service-lines/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useGroupServiceLines.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Migrated from raw handler to `secureRoute.queryWithParams` with `Feature.ACCESS_CLIENTS`. Replaced ad-hoc error responses with `AppError`. Added `take` limits: serviceLineExternals (1000), serviceLineMasters (100). Removed manual auth/permission checks and try-catch.

- [x] `GET /api/groups/[groupCode]/analytics/graphs` - Get group daily transaction metrics
  - **File**: `src/app/api/groups/[groupCode]/analytics/graphs/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupGraphData.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/analytics/page.tsx`
  - **Reviewed**: 2024-12-24
  - **Fix Applied**: 
    - **CRITICAL**: Added missing `take` limits to WIP transactions queries (500K opening balance, 250K current period) - previous code had NO limits which could crash database with large groups
    - Added Zod validation schema `GraphsQuerySchema` for `resolution` query param with enum allowlist (`high`, `standard`, `low`)
    - Added `Cache-Control: no-store` header for user-specific analytics data
    - Updated cache key to include resolution parameter for proper cache granularity
    - Added audit logging with `logger.info()` for both cached and fresh analytics access with comprehensive metrics (userId, groupCode, resolution, clientCount, taskCount, transactionCount, dateRange)
  - **Notes**: Route already had: `secureRoute.queryWithParams` with `Feature.ACCESS_CLIENTS`, explicit `select` fields, parallel queries via `Promise.all()` (2 batches), smart downsampling algorithm that preserves non-zero data points, shared transaction categorization logic, master service line breakdown, detailed debugging logs, 10-minute Redis caching.

---

## Notification Routes (7)

- [x] `GET /api/notifications` - List notifications
  - **File**: `src/app/api/notifications/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Page: `src/app/dashboard/notifications/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod validation schema for query params (page, pageSize with max 100, isRead, taskId). Uses `z.coerce` for URL string-to-number conversion. IDOR protection via service filtering by userId.

- [x] `DELETE /api/notifications` - Delete all read notifications
  - **File**: `src/app/api/notifications/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/notifications/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Notes**: Uses `secureRoute.mutation`. IDOR protection via service filtering by userId. No input validation needed (deletes current user's read notifications only).

- [x] `PATCH /api/notifications/[id]` - Mark as read/unread
  - **File**: `src/app/api/notifications/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `Number.parseInt` with `parseNumericId()`. Replaced ad-hoc error JSON with `AppError` throws. Added `markAsUnread` method to service to handle `isRead: false` case. Added explicit `select` to service findUnique.

- [x] `DELETE /api/notifications/[id]` - Delete notification
  - **File**: `src/app/api/notifications/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced `z.ZodAny` with `undefined` for no-body mutation. Replaced `Number.parseInt` with `parseNumericId()`. Replaced ad-hoc error JSON with `AppError` throws. Added explicit `select` to service findUnique.

- [x] `POST /api/notifications/mark-all-read` - Mark all as read
  - **File**: `src/app/api/notifications/mark-all-read/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Page: `src/app/dashboard/notifications/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Zod schema `MarkAllReadSchema` with `.strict()` for optional taskId validation. Replaced manual `request.json()` with schema-based validation. IDOR protection via service filtering by userId.

- [x] `GET /api/notifications/unread-count` - Get unread count
  - **File**: `src/app/api/notifications/unread-count/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Component: Header notification badge
  - **Reviewed**: 2024-12-19
  - **Notes**: Uses `secureRoute.query`. Proper `Cache-Control: no-store` header. IDOR protection via service filtering by userId. Simple and secure.

- [x] `POST /api/notifications/send-message` - Send message to user
  - **File**: `src/app/api/notifications/send-message/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced ad-hoc error JSON with `AppError` throws. Added explicit `select` clauses to `findUnique` and `findFirst` queries. Schema `SendUserMessageSchema` already uses `.strict()`. Task access authorization check in place.

---

## User Routes (6)

- [x] `GET /api/users/search` - Search users
  - **File**: `src/app/api/users/search/route.ts`
  - **Frontend**: 
    - Component: User search components
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added AppError for validation errors. Added query param validation (limit bounds, subServiceLineGroup format regex). Capped query length at 100 chars. Fixed `any` type in employeeSearch service with proper `EmployeeWhereClause` interface.

- [x] `GET /api/users/search/filters` - Get search filters
  - **File**: `src/app/api/users/search/filters/route.ts`
  - **Frontend**: 
    - Component: User search filters
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added Redis caching with 30-minute TTL (filter options change infrequently).

- [x] `GET /api/users/me/allocations` - Get my allocations
  - **File**: `src/app/api/users/me/allocations/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added secondary sort (`id`) for deterministic ordering. Added `take: 500` limit for bounded queries. Replaced `unknown[]` types with proper `AllocationData`, `FlatAllocationData`, `ClientGroup` interfaces.

- [x] `GET /api/users/notification-preferences` - Get preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Added explicit `select:` for all fields. Added tertiary sort (`id`) for deterministic ordering. Added `take: 200` limit.

- [x] `POST /api/users/notification-preferences` - Create preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced ad-hoc error response with `AppError`. Added explicit `select:` for create and existence check.

- [x] `PUT /api/users/notification-preferences` - Update preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages
  - **Reviewed**: 2024-12-19
  - **Fix Applied**: Replaced ad-hoc error responses with `AppError`. Added query param validation (notificationType format regex, taskId numeric validation). Added explicit `select:` for update/create/existence check.

---

## Tool Routes (14)

- [x] `GET /api/tools` - List tools
  - **File**: `src/app/api/tools/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using secureRoute.query but no issues. Added explicit select fields.
  - **Fix Applied**: Uses secureRoute.query with Feature.MANAGE_TOOLS. Explicit select fields for all queries.

- [x] `POST /api/tools` - Create tool
  - **File**: `src/app/api/tools/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using secureRoute.mutation but no Zod schema. Used ad-hoc error responses instead of AppError.
  - **Fix Applied**: Added CreateToolSchema for Zod validation. Uses AppError with proper error codes. Explicit select fields.

- [x] `GET /api/tools/[id]` - Get tool details
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler instead of secureRoute. Used parseInt instead of parseToolId. Feature imported from wrong path.
  - **Fix Applied**: Migrated to secureRoute.queryWithParams. Added parseToolId for ID parsing. Uses AppError. Explicit select fields.

- [x] `PUT /api/tools/[id]` - Update tool
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. No Zod schema validation. Used parseInt. Manual sanitization.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with UpdateToolSchema. Uses parseToolId. Explicit field mapping (no spreading user input).

- [x] `DELETE /api/tools/[id]` - Delete tool
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Used parseInt.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams. Uses parseToolId. Checks task count before deletion.

- [x] `GET /api/tools/[id]/assignments` - Get tool assignments
  - **File**: `src/app/api/tools/[id]/assignments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Used parseInt. Feature imported from wrong path.
  - **Fix Applied**: Migrated to secureRoute.queryWithParams. Uses parseToolId. Explicit select fields.

- [x] `PUT /api/tools/[id]/assignments` - Update tool assignments
  - **File**: `src/app/api/tools/[id]/assignments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Used parseInt. No Zod schema. Manual array validation.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with UpdateToolAssignmentsSchema. Uses parseToolId. Uses transaction for atomic updates.

- [x] `GET /api/tools/available` - Get available tools
  - **File**: `src/app/api/tools/available/route.ts`
  - **Frontend**: 
    - Component: Tool selection components
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. No feature permission check. No validation of subServiceLineGroup param.
  - **Fix Applied**: Migrated to secureRoute.query with Feature.ACCESS_TASKS. Added query param validation with regex. Explicit select fields.

- [x] `POST /api/tools/register` - Register tool from code registry
  - **File**: `src/app/api/tools/register/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Feature imported from wrong path. Manual body parsing/sanitization.
  - **Fix Applied**: Migrated to secureRoute.mutation with RegisterToolSchema. Uses AppError. Uses transaction for creating tool + sub-tabs.

- [x] `GET /api/tools/registered` - Get registered tools sync status
  - **File**: `src/app/api/tools/registered/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Feature imported from wrong path.
  - **Fix Applied**: Migrated to secureRoute.query. Uses logger for error logging. Uses AppError for config load failures.

- [x] `GET /api/tools/task/[taskId]` - Get tools for task
  - **File**: `src/app/api/tools/task/[taskId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Used parseInt. No task access check.
  - **Fix Applied**: Migrated to secureRoute.queryWithParams with taskIdParam for automatic task access check. Uses parseTaskId. VIEWER role required.

- [x] `POST /api/tools/task/[taskId]` - Add tool to task
  - **File**: `src/app/api/tools/task/[taskId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. No Zod schema. Manual sanitization.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with AddToolToTaskSchema and taskIdParam. EDITOR role required. Checks tool active status.

- [x] `DELETE /api/tools/task/[taskId]` - Remove tool from task
  - **File**: `src/app/api/tools/task/[taskId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Used parseInt for both taskId and toolId query param.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with taskIdParam. Uses parseTaskId and parseNumericId. EDITOR role required.

---

## Utility Routes (12)

### Employee Routes

- [x] `GET /api/employees` - List employees
  - **File**: `src/app/api/employees/route.ts`
  - **Frontend**: 
    - Component: Employee pickers/selectors
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

- [x] `GET /api/employees/[empCode]` - Get employee details
  - **File**: `src/app/api/employees/[empCode]/route.ts`
  - **Frontend**: 
    - Component: Employee profile displays
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.queryWithParams correctly.
  - **Fix Applied**: None needed.

### Health & Debug

- [x] `GET /api/health` - Health check
  - **File**: `src/app/api/health/route.ts`
  - **Frontend**: 
    - None (monitoring only)
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - intentionally unauthenticated for monitoring.
  - **Fix Applied**: None needed (health endpoints should be unauthenticated).

- [x] `GET /api/health/redis` - Redis health check
  - **File**: `src/app/api/health/redis/route.ts`
  - **Frontend**: 
    - None (monitoring only)
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth/admin checks.
  - **Fix Applied**: Migrated to secureRoute.query with Feature.SYSTEM_ADMIN. Uses successResponse.

- [x] `GET /api/debug/user-role` - Debug user role
  - **File**: `src/app/api/debug/user-role/route.ts`
  - **Frontend**: 
    - None (development only)
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

### Document Vault

- [ ] `POST /api/document-vault/extract` - Upload document and extract field suggestions
  - **File**: `src/app/api/document-vault/extract/route.ts`
  - **Frontend**: 
    - Component: `DocumentUploadForm.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.fileUpload` with `Feature.MANAGE_VAULT_DOCUMENTS`. AI endpoint with Azure OpenAI extraction. 50MB file size limit with MIME type allowlist. Needs review.

- [ ] `GET /api/document-vault/types` - Get active document types
  - **File**: `src/app/api/document-vault/types/route.ts`
  - **Frontend**: 
    - Component: `DocumentUploadForm.tsx`
  - **Reviewed**: [Pending]
  - **Notes**: Uses `secureRoute.query` with `Feature.ACCESS_VAULT_DOCUMENTS`. Returns active types only with explicit select fields. Needs review.

### Search Routes

- [x] `GET /api/search/legal-precedents` - Search legal precedents
  - **File**: `src/app/api/search/legal-precedents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth and enforceRateLimit.
  - **Fix Applied**: Migrated to secureRoute.query (rate limiting built-in). Cleaned up imports.

- [x] `GET /api/search/tax-law` - Search tax law
  - **File**: `src/app/api/search/tax-law/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth and enforceRateLimit.
  - **Fix Applied**: Migrated to secureRoute.query (rate limiting built-in). Cleaned up imports.

- [x] `GET /api/search/web` - Web search
  - **File**: `src/app/api/search/web/route.ts`
  - **Frontend**: 
    - AI components
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth. No validation on count param.
  - **Fix Applied**: Migrated to secureRoute.query. Added max limit (50) on count param.

### News Routes

- [x] `GET /api/news` - List news bulletins
  - **File**: `src/app/api/news/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/news/useNewsBulletins.ts`
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

- [x] `POST /api/news` - Create news bulletin
  - **File**: `src/app/api/news/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.mutation with schema.
  - **Fix Applied**: None needed.

- [x] `GET /api/news/[id]` - Get bulletin details
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth.
  - **Fix Applied**: Migrated to secureRoute.queryWithParams. Extracted common select fields.

- [x] `PUT /api/news/[id]` - Update bulletin
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth and JSON parsing.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with UpdateNewsBulletinSchema.

- [x] `DELETE /api/news/[id]` - Delete bulletin
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams.

- [x] `GET /api/news/[id]/document` - Get bulletin document
  - **File**: `src/app/api/news/[id]/document/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth. Old params pattern (synchronous).
  - **Fix Applied**: Migrated to secureRoute.queryWithParams. Uses AppError for validation.

- [x] `POST /api/news/generate` - AI generate news
  - **File**: `src/app/api/news/generate/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Not using secureRoute.ai wrapper.
  - **Fix Applied**: Migrated to secureRoute.ai with GenerateBulletinBodySchema (.strict()). AI rate limiting built-in.

- [x] `POST /api/news/upload-document` - Upload news document
  - **File**: `src/app/api/news/upload-document/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler. Not using secureRoute.fileUpload wrapper.
  - **Fix Applied**: Migrated to secureRoute.fileUpload. File upload rate limiting built-in. Added ALLOWED_MIME_TYPES constant.

### Other Utility Routes

- [x] `GET /api/office-codes` - List office codes
  - **File**: `src/app/api/office-codes/route.ts`
  - **Frontend**: 
    - Component: Office code dropdowns
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

- [x] `GET /api/permissions/check` - Check feature permissions
  - **File**: `src/app/api/permissions/check/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useFeature.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

- [x] `GET /api/workspace-counts` - Get workspace counts
  - **File**: `src/app/api/workspace-counts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/workspace/useWorkspaceCounts.ts`
    - Page: `src/app/dashboard/page.tsx`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly with caching.
  - **Fix Applied**: None needed.

- [x] `GET /api/standard-tasks` - List standard tasks
  - **File**: `src/app/api/standard-tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useStandardTasks.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query with Feature.MANAGE_TASKS.
  - **Fix Applied**: None needed.

- [x] `GET /api/templates/available` - Get available templates
  - **File**: `src/app/api/templates/available/route.ts`
  - **Frontend**: 
    - Component: Template selectors
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query correctly.
  - **Fix Applied**: None needed.

- [x] `GET /api/non-client-allocations` - List non-client allocations
  - **File**: `src/app/api/non-client-allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.query with Feature.MANAGE_TASKS.
  - **Fix Applied**: None needed.

- [x] `POST /api/non-client-allocations` - Create allocation
  - **File**: `src/app/api/non-client-allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: None - already using secureRoute.mutation with Feature.MANAGE_TASKS.
  - **Fix Applied**: None needed.

- [x] `PUT /api/non-client-allocations/[id]` - Update allocation
  - **File**: `src/app/api/non-client-allocations/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth. No Zod schema. Used parseInt.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with UpdateAllocationSchema. Uses Number.parseInt.

- [x] `DELETE /api/non-client-allocations/[id]` - Delete allocation
  - **File**: `src/app/api/non-client-allocations/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual auth. Used parseInt.
  - **Fix Applied**: Migrated to secureRoute.mutationWithParams with Feature.MANAGE_TASKS. Uses Number.parseInt.

- [x] `GET /api/performance` - Performance metrics
  - **File**: `src/app/api/performance/route.ts`
  - **Frontend**: 
    - None (monitoring only)
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual isSystemAdmin check. No rate limiting.
  - **Fix Applied**: Migrated to secureRoute.query with Feature.SYSTEM_ADMIN. Rate limiting built-in.

- [x] `DELETE /api/performance` - Clear performance metrics
  - **File**: `src/app/api/performance/route.ts`
  - **Frontend**: 
    - None (monitoring only)
  - **Reviewed**: 2024-12-19
  - **Issues Found**: Was using raw handler with manual isSystemAdmin check.
  - **Fix Applied**: Migrated to secureRoute.mutation with Feature.SYSTEM_ADMIN.

- [x] `POST /api/map` - Process trial balance mapping
  - **File**: `src/app/api/map/route.ts`
  - **Frontend**: 
    - Map component
  - **Reviewed**: 2024-12-19
  - **Issues Found**: CRITICAL - No authentication at all! No file validation. Used deprecated logInfo/logError.
  - **Fix Applied**: Added authentication, Feature.MANAGE_TASKS permission check, AI rate limiting, file type/size validation. Uses logger. Uses AppError for validation errors.

---

## Review Log

Use this section to document issues found during review:

### Issue Template

```markdown
**Route**: `GET /api/example`
**Date**: YYYY-MM-DD
**Reviewer**: Name
**Category**: Security / Performance / Correctness / Other
**Severity**: Low / Medium / High
**Issue**: Description of issue
**Fix Applied**: Description of fix
**Status**: Fixed / Pending / Won't Fix
```

### Issues Found

<!-- Add issues here as you find them -->

---

## Completion Tracking

**Started**: December 19, 2024
**Last Updated**: December 26, 2024
**Estimated Completion**: TBD (30 new routes discovered)

---

## Discovering Missing Routes

To systematically discover routes not yet documented in this checklist:

### Method 1: File System Scan

```bash
# List all route files
find src/app/api -name "route.ts" | sort

# Count total route files
find src/app/api -name "route.ts" | wc -l

# Compare with checklist count to identify gaps
```

### Method 2: Check for Multiple HTTP Methods

Many `route.ts` files contain multiple HTTP method exports (GET, POST, PUT, PATCH, DELETE). When reviewing:

1. Open each route file
2. Check for all exported methods: `export async function GET`, `POST`, `PUT`, `PATCH`, `DELETE`
3. Verify each method is documented in the checklist
4. Some files have 3-5 different methods that need separate checklist entries

### Method 3: Cross-Reference with Components

Search the codebase for API calls that might indicate undocumented routes:

```bash
# Find fetch calls
rg "fetch\(['\`]/api/" --type ts --type tsx

# Find axios/API calls
rg "(axios|api)\.(get|post|put|patch|delete)" --type ts --type tsx
```

### Method 4: Review Hook Files

Check all custom hooks in `src/hooks/` as they often make API calls:

```bash
ls -R src/hooks/
```

Each hook file typically corresponds to one or more API routes.

### Common Patterns for Missing Routes

Routes most likely to be missed:

1. **Nested Resource Routes** - e.g., `/tasks/[id]/resource/[resourceId]`
2. **Action Routes** - e.g., `/resource/[id]/action` (approve, submit, convert)
3. **Download/Export Routes** - e.g., `/resource/[id]/download` or `/resource/[id]/export`
4. **Bulk Operation Routes** - e.g., `/resource/bulk-update`
5. **Utility Routes** - e.g., `/resource/validate`, `/resource/check-duplicate`

### Verification Checklist

When you discover a new route:

- [ ] Document all HTTP methods in that route file
- [ ] Identify the frontend component/hook that uses it
- [ ] Mark as "Not yet reviewed" with current date
- [ ] Update the Progress Summary table counts
- [ ] Add notes about current implementation status (secureRoute vs raw handler)

---

*Remember: One route at a time. Quality over speed.*
