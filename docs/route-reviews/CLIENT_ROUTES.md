# Client Routes Review

**Domain**: Client Management & Analytics  
**Total Routes**: 21  
**Last Updated**: January 21, 2026

---

## Sign-Off Status

- [x] **Security Review** - Reviewer: System Date: 2024-12-19
- [x] **Performance Review** - Reviewer: System Date: 2024-12-24
- [x] **Data Integrity Review** - Reviewer: System Date: 2024-12-19

**Final Sign-Off**: ✅ COMPLETE - Date: 2024-12-22

**Notes**: All client routes reviewed and secured. Major performance improvements on analytics endpoints. Path traversal vulnerability fixed in document download. AI credit rating endpoints now use strict AI rate limiting.

---

## Review Standards

See [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) for detailed checklists.

---

## Progress Summary

| Subsection | Routes | Reviewed | Status |
|------------|--------|----------|--------|
| Client List & Details | 5 | 5 | ✅ Complete |
| Client Analytics | 10 | 10 | ✅ Complete |
| Client Financial Data | 4 | 4 | ✅ Complete |
| Client Documents | 2 | 2 | ✅ Complete |
| **TOTAL** | **21** | **21** | ✅ **Complete** |

---

## Client List & Details (5 routes)

### GET /api/clients
- **File**: `src/app/api/clients/route.ts`
- **Frontend**: `src/hooks/clients/useClients.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟡 **MEDIUM: No secondary sort**
- **Fixes Applied**: Added `ClientListQuerySchema` Zod validation for query params (search, page, limit, sortBy, sortOrder). Added `AppError` for consistent error handling. Added deterministic secondary sort (`GSClientID`) for pagination stability. Sort field allowlist already existed and was moved to Zod enum.

### GET /api/clients/filters
- **File**: `src/app/api/clients/filters/route.ts`
- **Frontend**: `src/hooks/clients/useClientFilters.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**
- **Fixes Applied**: Added `ClientFiltersQuerySchema` Zod validation for query params (industrySearch, groupSearch). Added `AppError` for consistent error handling. Route already had `take` limit of 30, caching, parallel queries.

### GET /api/clients/[id]
- **File**: `src/app/api/clients/[id]/route.ts`
- **Frontend**: `src/hooks/clients/useClients.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟡 **MEDIUM: Ad-hoc error handling**
- **Fixes Applied**: Added `ClientDetailQuerySchema` Zod validation for query params (taskPage, taskLimit, serviceLine, includeArchived). Changed ad-hoc error responses to `AppError`. Route already has GSClientID validation, caching, explicit `select` fields, Promise.all for parallel queries.

### PUT /api/clients/[id]
- **File**: `src/app/api/clients/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Mass assignment risk**, 🟡 **MEDIUM: Missing explicit select**
- **Fixes Applied**: Changed ad-hoc error responses to `AppError`. Changed from data spread to explicit field mapping for mass assignment protection. Added explicit `select` to all Prisma queries including findUnique and update response. Route already has UpdateClientSchema with validation, GSClientID validation, duplicate check, cache invalidation.

### DELETE /api/clients/[id]
- **File**: `src/app/api/clients/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟢 **LOW: ZodAny type**, 🟡 **MEDIUM: Include instead of select**, 🟢 **LOW: Missing cache invalidation**
- **Fixes Applied**: Replaced `z.ZodAny` with `z.ZodUndefined` (no `any` types). Changed `include` to explicit `select` fields. Changed ad-hoc error responses to `AppError`. Added `invalidateClientListCache()` on delete (was missing). Route already has GSClientID validation, orphan prevention (task count check), existence check.

---

## Client Analytics (10 routes)

### GET /api/clients/[id]/analytics/graphs
- **File**: `src/app/api/clients/[id]/analytics/graphs/route.ts`
- **Frontend**: `src/hooks/clients/useClientGraphData.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-24
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟡 **MEDIUM: Sequential queries**, 🟢 **LOW: Missing cache header**
- **Fixes Applied**: Added Zod validation schema `GraphsQuerySchema` for `resolution` query param with enum allowlist (`high`, `standard`, `low`). Added `Cache-Control: no-store` header for user-specific analytics data. Parallelized 3 independent database queries (client info + tasks + service line mappings, then opening balance + transactions) using `Promise.all()` for better performance. Added audit logging with `logger.info()` for analytics access (both cached and fresh). Updated cache key to include resolution parameter. Route already had `secureRoute.queryWithParams` with `Feature.ACCESS_CLIENTS`, explicit `select` fields, `take` limits (10000 tasks, 100000 opening txns, 50000 txns, 100 service lines), smart downsampling algorithm, shared transaction categorization logic.

### GET /api/clients/[id]/analytics/documents
- **File**: `src/app/api/clients/[id]/analytics/documents/route.ts`
- **Frontend**: `src/hooks/analytics/useClientAnalytics.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Unbounded query**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Added `take: 100` limit. Added explicit `select` fields. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

### POST /api/clients/[id]/analytics/documents
- **File**: `src/app/api/clients/[id]/analytics/documents/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No file type validation**
- **Fixes Applied**: Converted from raw handler to `secureRoute.fileUploadWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Added Zod validation for `documentType` field. Added explicit `select` on create response. File validation was already robust (size, MIME, magic number verification).

### GET /api/clients/[id]/analytics/documents/[documentId]
- **File**: `src/app/api/clients/[id]/analytics/documents/[documentId]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Manual ID parsing**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Added explicit `select` fields. Replaced ad-hoc errors with `AppError`.

### DELETE /api/clients/[id]/analytics/documents/[documentId]
- **File**: `src/app/api/clients/[id]/analytics/documents/[documentId]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Manual ID parsing**
- **Fixes Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed `include` to explicit `select`. Added `take: 10` limit on rating check. Replaced ad-hoc errors with `AppError`.

### GET /api/clients/[id]/analytics/rating
- **File**: `src/app/api/clients/[id]/analytics/rating/route.ts`
- **Frontend**: `src/hooks/analytics/useClientAnalytics.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Changed `include` to explicit `select` fields. Added deterministic secondary sort (`id`). Replaced ad-hoc errors with `AppError`.

### POST /api/clients/[id]/analytics/rating
- **File**: `src/app/api/clients/[id]/analytics/rating/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🔴 **CRITICAL: No AI rate limiting**
- **Fixes Applied**: Converted from raw handler to `secureRoute.aiWithParams` (strict AI rate limiting). Added `Feature.MANAGE_CLIENTS` permission. Changed `include` to explicit `select` in transaction. Replaced ad-hoc errors with `AppError`. Schema validation handled by secureRoute.

### GET /api/clients/[id]/analytics/rating/[ratingId]
- **File**: `src/app/api/clients/[id]/analytics/rating/[ratingId]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Manual ID parsing**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed `include` to explicit `select` fields. Replaced ad-hoc errors with `AppError`.

### DELETE /api/clients/[id]/analytics/rating/[ratingId]
- **File**: `src/app/api/clients/[id]/analytics/rating/[ratingId]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No audit logging**
- **Fixes Applied**: Converted from raw handler to `secureRoute.mutationWithParams`. Added `Feature.MANAGE_CLIENTS` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Added explicit `select` on existence check. Added audit logging with `logger.info` for sensitive deletion. Replaced ad-hoc errors with `AppError`.

### GET /api/clients/[id]/analytics/ratios
- **File**: `src/app/api/clients/[id]/analytics/ratios/route.ts`
- **Frontend**: `src/hooks/analytics/useClientAnalytics.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/analytics/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced ad-hoc errors with `AppError`. Route already had explicit `select` fields.

---

## Client Financial Data (4 routes)

### GET /api/clients/[id]/balances
- **File**: `src/app/api/clients/[id]/balances/route.ts`
- **Frontend**: `src/hooks/clients/useClientBalances.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Unbounded query**, 🟡 **MEDIUM: Sequential queries**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added `take: 10000` limit on client tasks query. Parallelized debtor aggregation and timestamp queries with `Promise.all()`. Route already had caching.

### GET /api/clients/[id]/debtors
- **File**: `src/app/api/clients/[id]/debtors/route.ts`
- **Frontend**: `src/hooks/clients/useClientDebtors.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: No caching**, 🟡 **MEDIUM: Sequential queries**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take` limits on service line queries. Parallelized debtor transactions and service line mappings queries.

### GET /api/clients/[id]/debtors/details
- **File**: `src/app/api/clients/[id]/debtors/details/route.ts`
- **Frontend**: `src/hooks/clients/useClientDebtorDetails.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: No caching**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take` limits on service line queries. Parallelized debtor transactions and service line mappings queries.

### GET /api/clients/[id]/wip
- **File**: `src/app/api/clients/[id]/wip/route.ts`
- **Frontend**: `src/hooks/clients/useClientWip.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: No caching**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Replaced ad-hoc errors with `AppError`. Added caching (10 min TTL). Added `take: 100` limit on master service lines query. Parallelized CARL partner codes and WIP transactions queries. Removed unused `MasterServiceLineInfo` interface.

---

## Client Documents (2 routes)

### GET /api/clients/[id]/documents
- **File**: `src/app/api/clients/[id]/documents/route.ts`
- **Frontend**: `src/hooks/clients/useClientDocuments.ts`, `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Unbounded queries**, 🟡 **MEDIUM: Include instead of select**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Replaced `GSClientIDSchema.safeParse()` with `parseGSClientID()`. Added `take` limits on all queries (500 for tasks, 200 for each document type, 100 for users). Changed `include` to explicit `select` on OpinionDocument query. Added deterministic secondary sort (`id`) on all document queries. Changed `Cache-Control` from `private, s-maxage=60` to `no-store` for user-specific data per workspace rules.

### GET /api/clients/[id]/documents/download
- **File**: `src/app/api/clients/[id]/documents/download/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/clients/[id]/documents/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🔴 **CRITICAL: Path traversal vulnerability**, 🟠 **HIGH: Manual ID parsing**
- **Fixes Applied**: Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_CLIENTS` permission. Added `DownloadQuerySchema` Zod validation for query params (documentType, documentId, taskId) with proper enum validation. Replaced `Number.parseInt()` with `parseNumericId()`. Added `validateFilePath()` function to prevent path traversal attacks (validates normalized path, checks for `..`, restricts to allowed base directories). Added explicit `select` on all Prisma queries. Replaced ad-hoc errors with `AppError`. Added `X-Content-Type-Options: nosniff` security header. Added audit logging for downloads. Changed `Cache-Control` to `no-store`.

---

## Domain Summary

### Key Improvements Made
1. **Critical Security Fixes**: 14 routes converted from raw handlers to secureRoute wrappers
2. **Path Traversal Prevention**: Document download route now validates file paths to prevent directory traversal attacks
3. **AI Rate Limiting**: Credit rating generation now uses `secureRoute.aiWithParams` for strict rate limiting
4. **Performance Optimization**: Analytics graph endpoint parallelized queries, reducing response time significantly
5. **Caching Strategy**: Added caching to financial data endpoints (balances, debtors, WIP)
6. **Input Validation**: All query params now validated with Zod schemas
7. **Explicit Selects**: All queries migrated from `include` to explicit `select` fields
8. **Audit Logging**: Sensitive operations (credit rating deletion, document downloads) now logged

### Patterns Established
- All routes use `secureRoute` with `Feature.ACCESS_CLIENTS` or `Feature.MANAGE_CLIENTS`
- Financial data endpoints cached for 10 minutes
- Analytics endpoints use `Promise.all()` for parallel queries
- All list endpoints have `take` limits and deterministic sorting
- User-specific data has `Cache-Control: no-store` header
- File downloads include `X-Content-Type-Options: nosniff` header

### Testing Notes
- Tested client CRUD operations
- Verified analytics graph generation with different resolutions
- Tested AI credit rating generation (multiple clients)
- Validated path traversal prevention with malicious paths (`../../../etc/passwd`)
- Tested document downloads across all document types
- Verified financial data accuracy (balances, WIP, debtors)

### Future Considerations
- Consider implementing real-time updates for financial data
- Add webhooks for client balance threshold alerts
- Implement document versioning for analytics documents
- Consider batch credit rating generation for multiple clients
- Add export functionality for financial reports
