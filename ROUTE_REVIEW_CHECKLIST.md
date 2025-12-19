# Route Review Checklist

A systematic checklist for reviewing all API routes for security and performance optimization.

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

| Category | Total | Reviewed |
|----------|-------|----------|
| Admin | 28 | 28 |
| Auth | 6 | 6 |
| BD | 27 | 27 |
| Clients | 16 | 14 |
| Tasks | 59 | 0 |
| Service Lines | 12 | 0 |
| Groups | 7 | 0 |
| Notifications | 5 | 0 |
| Users | 5 | 0 |
| Tools | 8 | 0 |
| Utility | 10 | 0 |
| **Total** | **183** | **75** |

---

## Admin Routes (25)

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

### Service Line Master

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

---

## Client Routes (16)

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

- [ ] `GET /api/clients/[id]/balances` - Get client balances
  - **File**: `src/app/api/clients/[id]/balances/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientBalances.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `GET /api/clients/[id]/debtors` - Get client debtors
  - **File**: `src/app/api/clients/[id]/debtors/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDebtors.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `GET /api/clients/[id]/debtors/details` - Get debtor details
  - **File**: `src/app/api/clients/[id]/debtors/details/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDebtorDetails.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `GET /api/clients/[id]/wip` - Get client WIP
  - **File**: `src/app/api/clients/[id]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientWip.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

### Client Documents

- [ ] `GET /api/clients/[id]/documents` - List client documents
  - **File**: `src/app/api/clients/[id]/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientDocuments.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`

- [ ] `POST /api/clients/[id]/documents` - Upload document
  - **File**: `src/app/api/clients/[id]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`

- [ ] `GET /api/clients/[id]/documents/download` - Download document
  - **File**: `src/app/api/clients/[id]/documents/download/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`

---

## Task Routes (59)

### Task List & Details

- [ ] `GET /api/tasks` - List tasks with pagination
  - **File**: `src/app/api/tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTasks.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `POST /api/tasks` - Create task
  - **File**: `src/app/api/tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useCreateTask.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]` - Get task details
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskData.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `PUT /api/tasks/[id]` - Update task
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskData.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `DELETE /api/tasks/[id]` - Soft delete task
  - **File**: `src/app/api/tasks/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `DELETE /api/tasks/[id]/permanent` - Permanently delete task
  - **File**: `src/app/api/tasks/[id]/permanent/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/filters` - Get task filter options
  - **File**: `src/app/api/tasks/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskFilters.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`

- [ ] `GET /api/tasks/check-duplicate` - Check for duplicate task
  - **File**: `src/app/api/tasks/check-duplicate/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useCheckDuplicateTaskCode.ts`

- [ ] `GET /api/tasks/kanban` - Get kanban board data
  - **File**: `src/app/api/tasks/kanban/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useKanbanBoard.ts`

### Task Stage & Status

- [ ] `PUT /api/tasks/[id]/stage` - Update task stage
  - **File**: `src/app/api/tasks/[id]/stage/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskStage.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/filing-status` - Get filing status
  - **File**: `src/app/api/tasks/[id]/filing-status/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/filing-status/page.tsx`

- [ ] `PUT /api/tasks/[id]/filing-status` - Update filing status
  - **File**: `src/app/api/tasks/[id]/filing-status/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/filing-status/page.tsx`

- [ ] `GET /api/tasks/[id]/search` - Search within task
  - **File**: `src/app/api/tasks/[id]/search/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

### Task Financial Data

- [ ] `GET /api/tasks/[id]/balances` - Get task balances
  - **File**: `src/app/api/tasks/[id]/balances/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskBalances.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/wip` - Get task WIP
  - **File**: `src/app/api/tasks/[id]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskWip.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/transactions` - Get task transactions
  - **File**: `src/app/api/tasks/[id]/transactions/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTransactions.ts`
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/trial-balance` - Get trial balance
  - **File**: `src/app/api/tasks/[id]/trial-balance/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/balance-sheet/page.tsx`

### Task Team & Users

- [ ] `GET /api/tasks/[id]/users` - List task users
  - **File**: `src/app/api/tasks/[id]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTeam.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `POST /api/tasks/[id]/users` - Add user to task
  - **File**: `src/app/api/tasks/[id]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTaskTeam.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `GET /api/tasks/[id]/users/[userId]` - Get task user details
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `PUT /api/tasks/[id]/users/[userId]` - Update task user
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `DELETE /api/tasks/[id]/users/[userId]` - Remove user from task
  - **File**: `src/app/api/tasks/[id]/users/[userId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `GET /api/tasks/[id]/users/[userId]/allocations` - Get user allocations
  - **File**: `src/app/api/tasks/[id]/users/[userId]/allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `GET /api/tasks/[id]/users/me` - Get current user's task access
  - **File**: `src/app/api/tasks/[id]/users/me/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useTaskAccess.ts`

- [ ] `PUT /api/tasks/[id]/team/[teamMemberId]/allocation` - Update allocation
  - **File**: `src/app/api/tasks/[id]/team/[teamMemberId]/allocation/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`

- [ ] `POST /api/tasks/[id]/team/[teamMemberId]/transfer` - Transfer team member
  - **File**: `src/app/api/tasks/[id]/team/[teamMemberId]/transfer/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

- [ ] `GET /api/tasks/[id]/team/allocations` - Get team allocations
  - **File**: `src/app/api/tasks/[id]/team/allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useTeamAllocations.ts`

### Task Acceptance

- [ ] `GET /api/tasks/[id]/acceptance` - Get acceptance status
  - **File**: `src/app/api/tasks/[id]/acceptance/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `POST /api/tasks/[id]/acceptance/initialize` - Initialize acceptance
  - **File**: `src/app/api/tasks/[id]/acceptance/initialize/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `GET /api/tasks/[id]/acceptance/answers` - Get answers
  - **File**: `src/app/api/tasks/[id]/acceptance/answers/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `POST /api/tasks/[id]/acceptance/answers` - Submit answers
  - **File**: `src/app/api/tasks/[id]/acceptance/answers/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `GET /api/tasks/[id]/acceptance/documents` - List acceptance docs
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `POST /api/tasks/[id]/acceptance/documents` - Upload acceptance doc
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `DELETE /api/tasks/[id]/acceptance/documents/[documentId]` - Delete doc
  - **File**: `src/app/api/tasks/[id]/acceptance/documents/[documentId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `GET /api/tasks/[id]/acceptance/status` - Get acceptance status
  - **File**: `src/app/api/tasks/[id]/acceptance/status/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `POST /api/tasks/[id]/acceptance/submit` - Submit for approval
  - **File**: `src/app/api/tasks/[id]/acceptance/submit/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

- [ ] `POST /api/tasks/[id]/permissions/approve-acceptance` - Approve
  - **File**: `src/app/api/tasks/[id]/permissions/approve-acceptance/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/acceptance/useAcceptanceQuestionnaire.ts`

### Task Tax & Compliance

- [ ] `GET /api/tasks/[id]/tax-calculation` - Get tax calculation
  - **File**: `src/app/api/tasks/[id]/tax-calculation/route.ts`
  - **Frontend**: 
    - Hook: `src/components/tools/tax-calculation/hooks/useTaxCalculation.ts`
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`

- [ ] `POST /api/tasks/[id]/tax-calculation` - Calculate tax
  - **File**: `src/app/api/tasks/[id]/tax-calculation/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`

- [ ] `GET /api/tasks/[id]/tax-calculation/export` - Export tax calc
  - **File**: `src/app/api/tasks/[id]/tax-calculation/export/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`

- [ ] `GET /api/tasks/[id]/tax-adjustments` - List tax adjustments
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`

- [ ] `POST /api/tasks/[id]/tax-adjustments` - Create adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/new/page.tsx`

- [ ] `GET /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Get adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`

- [ ] `PUT /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Update adjustment
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`

- [ ] `DELETE /api/tasks/[id]/tax-adjustments/[adjustmentId]` - Delete
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`

- [ ] `GET /api/tasks/[id]/tax-adjustments/[adjustmentId]/documents` - Docs
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`

- [ ] `POST /api/tasks/[id]/tax-adjustments/[adjustmentId]/extract` - Extract
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/[adjustmentId]/extract/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`

- [ ] `GET /api/tasks/[id]/tax-adjustments/suggestions` - AI suggestions
  - **File**: `src/app/api/tasks/[id]/tax-adjustments/suggestions/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/adjustments/page.tsx`

- [ ] `GET /api/tasks/[id]/compliance-checklist` - Get checklist
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`

- [ ] `POST /api/tasks/[id]/compliance-checklist` - Create checklist
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`

- [ ] `PUT /api/tasks/[id]/compliance-checklist/[itemId]` - Update item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/[itemId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`

- [ ] `DELETE /api/tasks/[id]/compliance-checklist/[itemId]` - Delete item
  - **File**: `src/app/api/tasks/[id]/compliance-checklist/[itemId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/compliance-checklist/page.tsx`

### Task Documents & Workspace

- [ ] `GET /api/tasks/[id]/administration-documents` - List admin docs
  - **File**: `src/app/api/tasks/[id]/administration-documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `GET /api/tasks/[id]/workspace/files` - List workspace files
  - **File**: `src/app/api/tasks/[id]/workspace/files/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `POST /api/tasks/[id]/workspace/files` - Upload file
  - **File**: `src/app/api/tasks/[id]/workspace/files/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `GET /api/tasks/[id]/workspace/files/[fileId]` - Get file
  - **File**: `src/app/api/tasks/[id]/workspace/files/[fileId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `DELETE /api/tasks/[id]/workspace/files/[fileId]` - Delete file
  - **File**: `src/app/api/tasks/[id]/workspace/files/[fileId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `GET /api/tasks/[id]/workspace/folders` - List folders
  - **File**: `src/app/api/tasks/[id]/workspace/folders/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

- [ ] `POST /api/tasks/[id]/workspace/folders` - Create folder
  - **File**: `src/app/api/tasks/[id]/workspace/folders/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/document-management/page.tsx`

### Task Mapped Accounts

- [ ] `GET /api/tasks/[id]/mapped-accounts` - List mapped accounts
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`

- [ ] `POST /api/tasks/[id]/mapped-accounts` - Create mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`

- [ ] `PUT /api/tasks/[id]/mapped-accounts/[accountId]` - Update mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/[accountId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`

- [ ] `DELETE /api/tasks/[id]/mapped-accounts/[accountId]` - Delete mapping
  - **File**: `src/app/api/tasks/[id]/mapped-accounts/[accountId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/mapping/page.tsx`

### Task Opinion Drafts

- [ ] `GET /api/tasks/[id]/opinion-drafts` - List drafts
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useOpinionDrafts.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `POST /api/tasks/[id]/opinion-drafts` - Create draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftOperations.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `GET /api/tasks/[id]/opinion-drafts/[draftId]` - Get draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftEditing.ts`
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `PUT /api/tasks/[id]/opinion-drafts/[draftId]` - Update draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftEditing.ts`

- [ ] `DELETE /api/tasks/[id]/opinion-drafts/[draftId]` - Delete draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useDraftOperations.ts`

- [ ] `POST /api/tasks/[id]/opinion-drafts/[draftId]/chat` - AI chat
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/chat/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `GET /api/tasks/[id]/opinion-drafts/[draftId]/documents` - Draft docs
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/documents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `GET /api/tasks/[id]/opinion-drafts/[draftId]/export` - Export draft
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/export/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `GET /api/tasks/[id]/opinion-drafts/[draftId]/sections` - List sections
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

- [ ] `POST /api/tasks/[id]/opinion-drafts/[draftId]/sections` - Add section
  - **File**: `src/app/api/tasks/[id]/opinion-drafts/[draftId]/sections/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/opinion-drafting/page.tsx`

### Task Research & AI

- [ ] `GET /api/tasks/[id]/research-notes` - List research notes
  - **File**: `src/app/api/tasks/[id]/research-notes/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `POST /api/tasks/[id]/research-notes` - Create research note
  - **File**: `src/app/api/tasks/[id]/research-notes/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `PUT /api/tasks/[id]/research-notes/[noteId]` - Update note
  - **File**: `src/app/api/tasks/[id]/research-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `DELETE /api/tasks/[id]/research-notes/[noteId]` - Delete note
  - **File**: `src/app/api/tasks/[id]/research-notes/[noteId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `POST /api/tasks/[id]/ai-tax-report` - Generate AI tax report
  - **File**: `src/app/api/tasks/[id]/ai-tax-report/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/tax-calculation/page.tsx`

- [ ] `GET /api/tasks/[id]/legal-precedents` - Get legal precedents
  - **File**: `src/app/api/tasks/[id]/legal-precedents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/sars-responses` - Get SARS responses
  - **File**: `src/app/api/tasks/[id]/sars-responses/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/sars-responses/page.tsx`

- [ ] `POST /api/tasks/[id]/sars-responses` - Create SARS response
  - **File**: `src/app/api/tasks/[id]/sars-responses/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/sars-responses/page.tsx`

### Task Engagement Letters

- [ ] `GET /api/tasks/[id]/engagement-letter` - Get engagement letter
  - **File**: `src/app/api/tasks/[id]/engagement-letter/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `POST /api/tasks/[id]/engagement-letter/generate` - Generate letter
  - **File**: `src/app/api/tasks/[id]/engagement-letter/generate/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tasks/[id]/engagement-letter/download` - Download letter
  - **File**: `src/app/api/tasks/[id]/engagement-letter/download/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

### Task Reporting & Notifications

- [ ] `GET /api/tasks/[id]/reporting/export` - Export report
  - **File**: `src/app/api/tasks/[id]/reporting/export/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/reporting/page.tsx`

- [ ] `GET /api/tasks/[id]/notification-preferences` - Get preferences
  - **File**: `src/app/api/tasks/[id]/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `PUT /api/tasks/[id]/notification-preferences` - Update preferences
  - **File**: `src/app/api/tasks/[id]/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

---

## Service Line Routes (12)

- [ ] `GET /api/service-lines` - List service lines
  - **File**: `src/app/api/service-lines/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useServiceLines.ts`
    - Page: `src/app/dashboard/page.tsx`

- [ ] `GET /api/service-lines/user-role` - Get user's service line role
  - **File**: `src/app/api/service-lines/user-role/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useServiceLineAccess.ts`

- [ ] `GET /api/service-lines/[serviceLine]` - Get service line stats
  - **File**: `src/app/api/service-lines/[serviceLine]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/page.tsx`

- [ ] `GET /api/service-lines/[serviceLine]/sub-groups` - List sub-groups
  - **File**: `src/app/api/service-lines/[serviceLine]/sub-groups/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useSubServiceLineGroups.ts`

- [ ] `GET /api/service-lines/[serviceLine]/external-lines` - External lines
  - **File**: `src/app/api/service-lines/[serviceLine]/external-lines/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/page.tsx`

- [ ] `GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/users` - Users
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/users/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/service-lines/useSubServiceLineUsers.ts`

- [ ] `GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines`
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/page.tsx`

### Planner Routes

- [ ] `GET /api/service-lines/[sL]/[sSLG]/planner/clients` - Planner clients
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useClientPlanner.ts`

- [ ] `GET /api/service-lines/[sL]/[sSLG]/planner/clients/filters` - Filters
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useClientPlannerFilters.ts`

- [ ] `GET /api/service-lines/[sL]/[sSLG]/planner/employees` - Planner employees
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useEmployeePlanner.ts`

- [ ] `GET /api/service-lines/[sL]/[sSLG]/planner/employees/filters` - Filters
  - **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useEmployeePlannerFilters.ts`

---

## Group Routes (7)

- [ ] `GET /api/groups` - List groups with pagination
  - **File**: `src/app/api/groups/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientGroups.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`

- [ ] `GET /api/groups/filters` - Get group filter options
  - **File**: `src/app/api/groups/filters/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupFilters.ts`

- [ ] `GET /api/groups/[groupCode]` - Get group details
  - **File**: `src/app/api/groups/[groupCode]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useClientGroup.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`

- [ ] `GET /api/groups/[groupCode]/debtors` - Get group debtors
  - **File**: `src/app/api/groups/[groupCode]/debtors/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupDebtors.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`

- [ ] `GET /api/groups/[groupCode]/wip` - Get group WIP
  - **File**: `src/app/api/groups/[groupCode]/wip/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/groups/useGroupWip.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`

- [ ] `GET /api/groups/[groupCode]/service-lines` - Get group service lines
  - **File**: `src/app/api/groups/[groupCode]/service-lines/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/clients/useGroupServiceLines.ts`
    - Page: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/groups/[groupCode]/page.tsx`

---

## Notification Routes (5)

- [ ] `GET /api/notifications` - List notifications
  - **File**: `src/app/api/notifications/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Page: `src/app/dashboard/notifications/page.tsx`

- [ ] `DELETE /api/notifications` - Delete all read notifications
  - **File**: `src/app/api/notifications/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/notifications/page.tsx`

- [ ] `PATCH /api/notifications/[id]` - Mark as read/unread
  - **File**: `src/app/api/notifications/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`

- [ ] `DELETE /api/notifications/[id]` - Delete notification
  - **File**: `src/app/api/notifications/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`

- [ ] `POST /api/notifications/mark-all-read` - Mark all as read
  - **File**: `src/app/api/notifications/mark-all-read/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Page: `src/app/dashboard/notifications/page.tsx`

- [ ] `GET /api/notifications/unread-count` - Get unread count
  - **File**: `src/app/api/notifications/unread-count/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/notifications/useNotifications.ts`
    - Component: Header notification badge

- [ ] `POST /api/notifications/send-message` - Send message to user
  - **File**: `src/app/api/notifications/send-message/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/users/page.tsx`

---

## User Routes (5)

- [ ] `GET /api/users/search` - Search users
  - **File**: `src/app/api/users/search/route.ts`
  - **Frontend**: 
    - Component: User search components

- [ ] `GET /api/users/search/filters` - Get search filters
  - **File**: `src/app/api/users/search/filters/route.ts`
  - **Frontend**: 
    - Component: User search filters

- [ ] `GET /api/users/me/allocations` - Get my allocations
  - **File**: `src/app/api/users/me/allocations/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/page.tsx`

- [ ] `GET /api/users/notification-preferences` - Get preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages

- [ ] `POST /api/users/notification-preferences` - Create preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages

- [ ] `PUT /api/users/notification-preferences` - Update preferences
  - **File**: `src/app/api/users/notification-preferences/route.ts`
  - **Frontend**: 
    - Page: Settings/preferences pages

---

## Tool Routes (8)

- [ ] `GET /api/tools` - List tools
  - **File**: `src/app/api/tools/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `POST /api/tools` - Create tool
  - **File**: `src/app/api/tools/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `GET /api/tools/[id]` - Get tool details
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `PUT /api/tools/[id]` - Update tool
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `DELETE /api/tools/[id]` - Delete tool
  - **File**: `src/app/api/tools/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `GET /api/tools/[id]/assignments` - Get tool assignments
  - **File**: `src/app/api/tools/[id]/assignments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `POST /api/tools/[id]/assignments` - Assign tool
  - **File**: `src/app/api/tools/[id]/assignments/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/admin/tools/page.tsx`

- [ ] `GET /api/tools/available` - Get available tools
  - **File**: `src/app/api/tools/available/route.ts`
  - **Frontend**: 
    - Component: Tool selection components

- [ ] `POST /api/tools/register` - Register tool for task
  - **File**: `src/app/api/tools/register/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tools/registered` - Get registered tools
  - **File**: `src/app/api/tools/registered/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `GET /api/tools/task/[taskId]` - Get tools for task
  - **File**: `src/app/api/tools/task/[taskId]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

---

## Utility Routes (10)

### Employee Routes

- [ ] `GET /api/employees` - List employees
  - **File**: `src/app/api/employees/route.ts`
  - **Frontend**: 
    - Component: Employee pickers/selectors

- [ ] `GET /api/employees/[empCode]` - Get employee details
  - **File**: `src/app/api/employees/[empCode]/route.ts`
  - **Frontend**: 
    - Component: Employee profile displays

### Health & Debug

- [ ] `GET /api/health` - Health check
  - **File**: `src/app/api/health/route.ts`
  - **Frontend**: 
    - None (monitoring only)

- [ ] `GET /api/health/redis` - Redis health check
  - **File**: `src/app/api/health/redis/route.ts`
  - **Frontend**: 
    - None (monitoring only)

- [ ] `GET /api/debug/user-role` - Debug user role
  - **File**: `src/app/api/debug/user-role/route.ts`
  - **Frontend**: 
    - None (development only)

### Search Routes

- [ ] `POST /api/search/legal-precedents` - Search legal precedents
  - **File**: `src/app/api/search/legal-precedents/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `POST /api/search/tax-law` - Search tax law
  - **File**: `src/app/api/search/tax-law/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/tasks/[id]/page.tsx`

- [ ] `POST /api/search/web` - Web search
  - **File**: `src/app/api/search/web/route.ts`
  - **Frontend**: 
    - AI components

### News Routes

- [ ] `GET /api/news` - List news bulletins
  - **File**: `src/app/api/news/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/news/useNewsBulletins.ts`
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `POST /api/news` - Create news bulletin
  - **File**: `src/app/api/news/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `GET /api/news/[id]` - Get bulletin details
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `PUT /api/news/[id]` - Update bulletin
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `DELETE /api/news/[id]` - Delete bulletin
  - **File**: `src/app/api/news/[id]/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `GET /api/news/[id]/document` - Get bulletin document
  - **File**: `src/app/api/news/[id]/document/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `POST /api/news/generate` - AI generate news
  - **File**: `src/app/api/news/generate/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

- [ ] `POST /api/news/upload-document` - Upload news document
  - **File**: `src/app/api/news/upload-document/route.ts`
  - **Frontend**: 
    - Page: `src/app/dashboard/business_dev/news/page.tsx`

### Other Utility Routes

- [ ] `GET /api/office-codes` - List office codes
  - **File**: `src/app/api/office-codes/route.ts`
  - **Frontend**: 
    - Component: Office code dropdowns

- [ ] `GET /api/permissions/check` - Check feature permissions
  - **File**: `src/app/api/permissions/check/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/permissions/useFeature.ts`

- [ ] `GET /api/workspace-counts` - Get workspace counts
  - **File**: `src/app/api/workspace-counts/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/workspace/useWorkspaceCounts.ts`
    - Page: `src/app/dashboard/page.tsx`

- [ ] `GET /api/standard-tasks` - List standard tasks
  - **File**: `src/app/api/standard-tasks/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/tasks/useStandardTasks.ts`

- [ ] `GET /api/templates/available` - Get available templates
  - **File**: `src/app/api/templates/available/route.ts`
  - **Frontend**: 
    - Component: Template selectors

- [ ] `GET /api/non-client-allocations` - List non-client allocations
  - **File**: `src/app/api/non-client-allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`

- [ ] `POST /api/non-client-allocations` - Create allocation
  - **File**: `src/app/api/non-client-allocations/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`

- [ ] `PUT /api/non-client-allocations/[id]` - Update allocation
  - **File**: `src/app/api/non-client-allocations/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`

- [ ] `DELETE /api/non-client-allocations/[id]` - Delete allocation
  - **File**: `src/app/api/non-client-allocations/[id]/route.ts`
  - **Frontend**: 
    - Hook: `src/hooks/planning/useNonClientAllocations.ts`

- [ ] `GET /api/performance` - Performance metrics
  - **File**: `src/app/api/performance/route.ts`
  - **Frontend**: 
    - None (monitoring only)

- [ ] `GET /api/map` - Get map data
  - **File**: `src/app/api/map/route.ts`
  - **Frontend**: 
    - Map component

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

**Started**: ___________
**Last Updated**: ___________
**Estimated Completion**: ___________

---

*Remember: One route at a time. Quality over speed.*
