# BD Routes Review

**Domain**: Business Development - Opportunities, Proposals, Activities  
**Total Routes**: 17  
**Last Updated**: January 21, 2026

---

## Sign-Off Status

- [x] **Security Review** - Reviewer: System Date: 2024-12-19
- [x] **Performance Review** - Reviewer: System Date: 2024-12-19
- [x] **Data Integrity Review** - Reviewer: System Date: 2024-12-19

**Final Sign-Off**: ✅ COMPLETE - Date: 2024-12-21

**Notes**: All BD routes fully reviewed and secured. Major rewrites completed for CRUD operations on activities, contacts, and proposals. All routes now use secureRoute wrappers with proper feature permissions, explicit select fields, and branded ID utilities.

---

## Review Standards

See [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) for detailed checklists.

---

## Progress Summary

| Subsection | Routes | Reviewed | Status |
|------------|--------|----------|--------|
| Activities | 5 | 5 | ✅ Complete |
| Analytics | 3 | 3 | ✅ Complete |
| Contacts | 5 | 5 | ✅ Complete |
| Opportunities | 8 | 8 | ✅ Complete |
| Proposals | 5 | 5 | ✅ Complete |
| Stages | 1 | 1 | ✅ Complete |
| Company Research | 2 | 2 | ✅ Complete |
| **TOTAL** | **29** | **29** | ✅ **Complete** |

---

## Activities (5 routes)

### GET /api/bd/activities
- **File**: `src/app/api/bd/activities/route.ts`
- **Frontend**: `src/hooks/bd/useActivities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Route already properly secured with `secureRoute.query`, `Feature.ACCESS_BD`, Zod validation with `.strict()`, pagination with `.max(100)` pageSize. Service uses `Promise.all()` for parallel queries.

### POST /api/bd/activities
- **File**: `src/app/api/bd/activities/route.ts`
- **Frontend**: `src/hooks/bd/useActivities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Mass assignment risk** - Spread operator used
- **Fixes Applied**: Changed from spread operator to explicit field mapping for mass assignment protection. Route already has `secureRoute.mutation`, feature permission, Zod schema with `.strict()`.

### GET /api/bd/activities/[id]
- **File**: `src/app/api/bd/activities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useActivities.ts`, `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Manual ID parsing**, 🟠 **HIGH: Include instead of select**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_BD` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed from `include` to explicit `select` fields. Replaced ad-hoc errors with `AppError`.

### PUT /api/bd/activities/[id]
- **File**: `src/app/api/bd/activities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useActivities.ts`, `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No rate limiting**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before update, explicit field mapping. Now has rate limiting via secureRoute.

### DELETE /api/bd/activities/[id]
- **File**: `src/app/api/bd/activities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useActivities.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete. Now has rate limiting via secureRoute.

---

## Analytics (3 routes)

### GET /api/bd/analytics/conversion
- **File**: `src/app/api/bd/analytics/conversion/route.ts`
- **Frontend**: `src/hooks/bd/useBDAnalytics.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No query validation**
- **Fixes Applied**: Converted from raw handler to `secureRoute.query`. Added `Feature.ACCESS_BD` permission. Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route now has rate limiting via secureRoute.

### GET /api/bd/analytics/forecast
- **File**: `src/app/api/bd/analytics/forecast/route.ts`
- **Frontend**: `src/hooks/bd/useBDAnalytics.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No query validation**
- **Fixes Applied**: Converted from raw handler to `secureRoute.query`. Added `Feature.ACCESS_BD` permission. Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route now has rate limiting via secureRoute.

### GET /api/bd/analytics/pipeline
- **File**: `src/app/api/bd/analytics/pipeline/route.ts`
- **Frontend**: `src/hooks/bd/useBDAnalytics.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Missing query validation**
- **Fixes Applied**: Added `BDAnalyticsFiltersSchema` Zod validation for query params. Route already had `secureRoute.query` with feature permission.

---

## Contacts (5 routes)

### GET /api/bd/contacts
- **File**: `src/app/api/bd/contacts/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟡 **MEDIUM: Missing explicit select**
- **Fixes Applied**: Added Zod validation for query params with `.max(100)` on pageSize. Added explicit `select` fields. Added deterministic secondary sort (`id`). Route already had secureRoute with feature permission.

### POST /api/bd/contacts
- **File**: `src/app/api/bd/contacts/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Mass assignment risk**
- **Fixes Applied**: Changed from spread operator to explicit field mapping. Added explicit `select` fields on response. Schema already has `.strict()`.

### GET /api/bd/contacts/[id]
- **File**: `src/app/api/bd/contacts/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added feature permission, `parseNumericId()`, explicit `select` fields, `AppError` for consistent error handling.

### PUT /api/bd/contacts/[id]
- **File**: `src/app/api/bd/contacts/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check, explicit field mapping, explicit `select` fields.

### DELETE /api/bd/contacts/[id]
- **File**: `src/app/api/bd/contacts/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete.

---

## Opportunities (8 routes)

### GET /api/bd/opportunities
- **File**: `src/app/api/bd/opportunities/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Route already properly secured with `secureRoute.query`, `Feature.ACCESS_BD`, Zod validation. Service has pagination and explicit select on relations.

### POST /api/bd/opportunities
- **File**: `src/app/api/bd/opportunities/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Mass assignment risk**
- **Fixes Applied**: Changed from spread operator to explicit field mapping. Schema already has `.strict()`.

### GET /api/bd/opportunities/[id]
- **File**: `src/app/api/bd/opportunities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: Manual ID parsing**, 🟡 **MEDIUM: Ad-hoc error handling**
- **Fixes Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Changed ad-hoc error response to `AppError`. Already had secureRoute with feature permission.

### PUT /api/bd/opportunities/[id]
- **File**: `src/app/api/bd/opportunities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: Manual ID parsing**, 🟡 **MEDIUM: No existence check**
- **Fixes Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Added existence check before update. Added explicit field mapping instead of passing data directly.

### DELETE /api/bd/opportunities/[id]
- **File**: `src/app/api/bd/opportunities/[id]/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: Manual ID parsing**, 🟢 **LOW: ZodAny type**
- **Fixes Applied**: Replaced `Number.parseInt()` with `parseNumericId()`. Added existence check before delete. Removed `z.ZodAny` type.

### POST /api/bd/opportunities/[id]/convert
- **File**: `src/app/api/bd/opportunities/[id]/convert/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check, already-converted validation.

### PUT /api/bd/opportunities/[id]/stage
- **File**: `src/app/api/bd/opportunities/[id]/stage/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before stage move.

### GET /api/bd/opportunities/pipeline
- **File**: `src/app/api/bd/opportunities/pipeline/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Unbounded query**
- **Fixes Applied**: Converted from raw handler to `secureRoute.query`. Added feature permission, Zod validation for query params. Added `take: 500` limit to service.

---

## Proposals (5 routes)

### GET /api/bd/proposals
- **File**: `src/app/api/bd/proposals/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟡 **MEDIUM: Include instead of select**
- **Fixes Applied**: Added Zod validation for query params (`opportunityId`, `status`, `page`, `pageSize`) with `.max(100)` on pageSize. Changed from `include` to explicit `select` fields. Added deterministic secondary sort (`id`).

### POST /api/bd/proposals
- **File**: `src/app/api/bd/proposals/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: Double body parsing**, 🟡 **MEDIUM: Mass assignment risk**
- **Fixes Applied**: Fixed double body parsing issue (was parsing body twice). Changed from spread operator to explicit field mapping for mass assignment protection. Added `CreateProposalWithFileSchema` to validate file metadata in body. Added opportunity existence validation. Changed from `include` to explicit `select` fields. Replaced ad-hoc error with `AppError`.

### GET /api/bd/proposals/[id]
- **File**: `src/app/api/bd/proposals/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.queryWithParams`. Added `Feature.ACCESS_BD` permission. Replaced `Number.parseInt()` with `parseNumericId()`. Changed from `include` to explicit `select` fields. Replaced ad-hoc error with `AppError`.

### PUT /api/bd/proposals/[id]
- **File**: `src/app/api/bd/proposals/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before update, explicit field mapping instead of passing `validated` directly. Changed from `include` to explicit `select` fields.

### DELETE /api/bd/proposals/[id]
- **File**: `src/app/api/bd/proposals/[id]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: **MAJOR REWRITE** - Converted from raw handler to `secureRoute.mutationWithParams`. Added feature permission, `parseNumericId()`, existence check before delete.

---

## Stages (1 route)

### GET /api/bd/stages
- **File**: `src/app/api/bd/stages/route.ts`
- **Frontend**: `src/hooks/bd/useOpportunities.ts`, `src/app/dashboard/[serviceLine]/bd/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🟠 **HIGH: Unbounded query**
- **Fixes Applied**: Added Zod validation for `serviceLine` query param. Added explicit `select` fields. Added deterministic secondary sort (`id`). Added `take: 100` limit.

---

## Company Research (2 routes)

### GET /api/bd/company-research
- **File**: `src/app/api/bd/company-research/route.ts`
- **Frontend**: `src/hooks/bd/useCompanyResearch.ts`, `src/components/features/bd/CompanyResearchModal.tsx`
- **Reviewed**: ✅ 2024-12-23
- **Issues Found**: None
- **Notes**: Uses `secureRoute.query` with `Feature.ACCESS_BD`. Simple availability check, no database queries. Proper error handling and response wrapper.

### POST /api/bd/company-research
- **File**: `src/app/api/bd/company-research/route.ts`
- **Frontend**: `src/hooks/bd/useCompanyResearch.ts`, `src/components/features/bd/CompanyResearchModal.tsx`
- **Reviewed**: ✅ 2024-12-23
- **Issues Found**: 🟢 **LOW: `any` types in agent**
- **Fixes Applied**: Replaced `as any` with `Record<string, unknown>` in `companyResearchAgent.ts` (lines 157, 183). Added proper type guards for source mapping to eliminate all `any` types. Route already uses `secureRoute.ai` (strict AI rate limiting), `CompanyResearchSchema` with `.strict()`, proper `logger` usage, `AppError` for errors, graceful fallback on external API failure.

---

## Domain Summary

### Key Improvements Made
1. **Critical Security Fixes**: 12 routes converted from raw handlers to secureRoute wrappers
2. **Mass Assignment Protection**: All mutation routes use explicit field mapping (no spread operators)
3. **Input Validation**: Zod schemas added to all query params and request bodies
4. **ID Parsing**: All routes use branded ID utilities (`parseNumericId()`)
5. **Explicit Selects**: All queries now use explicit field selection (no `select *` or `include`)
6. **Rate Limiting**: All mutations now have proper rate limiting via secureRoute
7. **Type Safety**: Eliminated all `any` types including AI agent code

### Patterns Established
- All routes use `secureRoute` with `Feature.ACCESS_BD` permission
- List endpoints have pagination with `.max(100)` limits
- All list endpoints have deterministic secondary sorting
- Existence checks before updates/deletes
- Consistent error handling with `AppError`
- AI endpoints use `secureRoute.ai` for strict rate limiting

### Testing Notes
- Tested opportunity pipeline and conversion flows
- Verified proposal file attachments work correctly
- Company research AI agent tested with multiple queries
- All CRUD operations validated for activities, contacts, opportunities, and proposals

### Future Considerations
- Consider implementing caching for frequently accessed analytics data
- Add webhook notifications for important BD events (opportunity conversions, proposal submissions)
- Implement activity timeline/audit log for opportunity lifecycle
- Consider batch operations for bulk opportunity stage updates
