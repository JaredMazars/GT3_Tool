# Service Line Routes Review

**Domain**: Service Line Management, Planner, User Access  
**Total Routes**: 12  
**Last Updated**: January 21, 2026

---

## Sign-Off Status

- [x] **Security Review** - Reviewer: System Date: 2024-12-19
- [x] **Performance Review** - Reviewer: System Date: 2024-12-19
- [ ] **Data Integrity Review** - Reviewer: _____ Date: _____

**Final Sign-Off**: 🔄 IN PROGRESS - 1 route pending review

**Notes**: 11 of 12 service line routes reviewed and secured. Major improvements to planner routes including type safety, query validation, and service line access checks. User accessible groups route still needs review.

---

## Review Standards

See [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) for detailed checklists.

---

## Progress Summary

| Subsection | Routes | Reviewed | Status |
|------------|--------|----------|--------|
| Service Line Management | 6 | 6 | ✅ Complete |
| Planner Routes | 5 | 5 | ✅ Complete |
| User Accessible Groups | 1 | 0 | ⏸️ Pending Review |
| **TOTAL** | **12** | **11** | 🔄 **92% Complete** |

---

## Service Line Management (6 routes)

### GET /api/service-lines
- **File**: `src/app/api/service-lines/route.ts`
- **Frontend**: `src/hooks/service-lines/useServiceLines.ts`, `src/app/dashboard/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Missing feature permission**
- **Fixes Applied**: Added `Feature.ACCESS_DASHBOARD` permission check. Route already had secureRoute wrapper and explicit selects.

### GET /api/service-lines/user-role
- **File**: `src/app/api/service-lines/user-role/route.ts`
- **Frontend**: `src/hooks/permissions/useServiceLineAccess.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟠 **HIGH: No query validation**, 🔴 **CRITICAL: IDOR vulnerability**, 🟡 **MEDIUM: Manual employee ID parsing**
- **Fixes Applied**: Added Zod validation for query params. Added IDOR protection (users can only query roles for sub-groups they have access to, or their own role). Added `Feature.ACCESS_DASHBOARD` permission. Fixed employee ID parsing validation. Replaced ad-hoc error responses with AppError.

### GET /api/service-lines/[serviceLine]
- **File**: `src/app/api/service-lines/[serviceLine]/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🟡 **MEDIUM: Missing feature permission**, 🟡 **MEDIUM: Ad-hoc errors**
- **Fixes Applied**: Added `Feature.ACCESS_DASHBOARD` permission. Replaced ad-hoc error responses with AppError throws.

### GET /api/service-lines/[serviceLine]/sub-groups
- **File**: `src/app/api/service-lines/[serviceLine]/sub-groups/route.ts`
- **Frontend**: `src/hooks/service-lines/useSubServiceLineGroups.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No service line validation**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation with `isValidServiceLine()`. Added service line access check. Removed unused `cache` and `CACHE_PREFIXES` imports. Removed trailing blank lines.

### GET /api/service-lines/[serviceLine]/external-lines
- **File**: `src/app/api/service-lines/[serviceLine]/external-lines/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation with `isValidServiceLine()`. Added service line access check with `checkServiceLineAccess()`. Removed trailing blank lines.

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/users
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/users/route.ts`
- **Frontend**: `src/hooks/service-lines/useSubServiceLineUsers.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟢 **LOW: `any` type usage**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()`. Fixed `any` type usage by defining proper `SubGroupInfo` interface. Replaced `handleApiError` catch with secureRoute error handling. Added proper Feature permission.

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/external-lines/route.ts`
- **Frontend**: `src/app/dashboard/[serviceLine]/[subServiceLineGroup]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()`. Added service line validation. Added both service line and sub-service line group access checks. Removed trailing blank lines.

---

## Planner Routes (5 routes)

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/route.ts`
- **Frontend**: `src/hooks/planning/useClientPlanner.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No query validation**, 🟢 **LOW: `any` types**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Added Zod validation for query params (page, limit, filter arrays with max limit 100). Defined proper TypeScript interfaces (`SubGroupInfo`, `ClientPlannerResponse`, `TaskRow`, `AllocationRow`) to replace `any` types. Replaced `handleApiError` catch with AppError throws. Removed unused perf tracking variables.

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters/route.ts`
- **Frontend**: `src/hooks/planning/useClientPlannerFilters.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟢 **LOW: `any` types**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Defined proper TypeScript interfaces (`SubGroupInfo`, `ClientPlannerFiltersResponse`, `FilterOption`) to replace `any` types. Replaced `handleApiError` catch with AppError throws. Removed unused `queryStart` perf variable. Removed trailing blank lines.

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/route.ts`
- **Frontend**: `src/hooks/planning/useEmployeePlanner.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No query validation**, 🟢 **LOW: `any` types**, 🟢 **LOW: Unsafe role cast**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Added Zod validation for query params (page, limit max 100, includeUnallocated, filter arrays). Defined proper TypeScript interfaces (`SubGroupInfo`, `EmployeePlannerResponse`, `AllocationRow`, `ServiceLineEmployee`, `TaskTeamWhereInput`) to replace `any` types. Replaced `role: 'VIEWER' as any` with `ServiceLineRole.VIEWER`. Replaced `handleApiError` catch with AppError throws. Removed unused perf tracking variables.

### GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/filters
- **File**: `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/filters/route.ts`
- **Frontend**: `src/hooks/planning/useEmployeePlannerFilters.ts`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟢 **LOW: `any` types**
- **Fixes Applied**: Migrated to `secureRoute.queryWithParams()` with `Feature.ACCESS_DASHBOARD`. Defined proper TypeScript interfaces (`SubGroupInfo`, `EmployeePlannerFiltersResponse`, `FilterOption`) to replace `any` types. Removed unused `mapUsersToEmployees` import. Replaced `handleApiError` catch with AppError throws. Removed unused `queryStart` perf variable.

---

## User Accessible Groups (1 route - PENDING)

### GET /api/service-lines/user-accessible-groups
- **File**: `src/app/api/service-lines/user-accessible-groups/route.ts`
- **Frontend**: Used for dashboard navigation and service line selection
- **Reviewed**: ⏸️ PENDING
- **Notes**: Route exists and is implemented. Uses `secureRoute.query` with `Feature.ACCESS_DASHBOARD`. Needs security review for IDOR protection, performance review for query optimization (includes employee lookup and task counting), and input validation review.

---

## Domain Summary

### Key Improvements Made
1. **Critical Security Fixes**: 7 routes migrated from raw handlers to secureRoute wrappers
2. **IDOR Protection**: User role route now validates users can only query accessible groups
3. **Type Safety**: Eliminated all `any` types with proper TypeScript interfaces
4. **Service Line Validation**: All routes validate service line and sub-group access
5. **Query Validation**: Planner routes now validate all query parameters with Zod
6. **Planner Performance**: Removed unnecessary performance tracking variables

### Patterns Established
- All routes use `secureRoute` with `Feature.ACCESS_DASHBOARD` or role-specific permissions
- Service line validation using `isValidServiceLine()`
- Access checks with `checkServiceLineAccess()` for service line and sub-group
- Planner routes use proper TypeScript interfaces (no `any` types)
- Query params validated with Zod schemas (pagination limits, filter arrays)

### Security Highlights
- **IDOR Protection**: User role queries restricted to accessible groups
- **Service Line Access**: All endpoints verify user has access to requested service line/sub-group
- **Query Validation**: Planner filter arrays limited to prevent abuse
- **Feature Permissions**: Consistent use of `Feature.ACCESS_DASHBOARD`

### Testing Notes
- Tested service line listing and stats
- Verified user role queries with various access levels
- Tested planner views (client planner, employee planner)
- Validated filter options for planning views
- Tested sub-group user listings
- Verified external line mappings

### Future Considerations
- Implement caching for planner data (complex queries, infrequent changes)
- Add planner export functionality (Excel/PDF)
- Implement planner bulk allocation operations
- Add planner forecasting and capacity planning
- Consider implementing planner templates for common allocations
- Complete review of user-accessible-groups route

---

## Pending Work

### User Accessible Groups Route
- `GET /api/service-lines/user-accessible-groups`

**Next Steps**:
1. Review IDOR protection (verify users only see groups they have access to)
2. Performance review (query includes employee lookup and task counting - may need optimization)
3. Input validation review (check for any query params)
4. Test with various user permission levels
5. Sign off after review
