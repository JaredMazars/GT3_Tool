# Employee Status Indicator Fix

## Problem
Active employees without user accounts (like Darnell Martin) were showing **red borders** (inactive) instead of **yellow borders** (active, no account) in the planner timeline.

## Root Cause
The employee mapping lookup was failing for certain userId formats, causing `employeeStatus` to be `undefined`. The badge component then defaulted to `isActive=false` due to the nullish coalescing operator (`??`).

**Failure chain:**
1. `allocation.userId` doesn't match `Employee.WinLogon` patterns
2. `mapUsersToEmployees()` returns no match
3. `employee` is `undefined`
4. Status lookup skipped
5. Badge receives `isActive={undefined ?? false}` → Shows RED

## Solution Implemented

### 1. Created Employee Code Extractor Utility
**File:** `src/lib/utils/employeeCodeExtractor.ts`

Handles multiple userId formats:
- `pending-EMPCODE` (e.g., `pending-DM`)
- `emp_EMPCODE_timestamp` (e.g., `emp_SOOA002_1765469537556`)
- Direct employee codes (e.g., `DM`, `SOOA002`)
- Email variants for matching

### 2. Enhanced Employee Mapping
**File:** `src/lib/services/employees/employeeService.ts`

Improved `mapUsersToEmployees()` to:
- Extract employee codes from non-email userIds
- Query by both email AND employee code
- Generate multiple email domain variants
- Build comprehensive lookup maps

### 3. Added Fallback Status Lookup
**Files:**
- `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/route.ts`
- `src/app/api/tasks/[id]/team/allocations/route.ts`

Added fallback logic:
```typescript
let empStatus = employee?.EmpCode ? employeeStatusMap.get(employee.EmpCode) : undefined;

// Fallback: Try extracting employee code from userId
if (!empStatus) {
  const extractedEmpCode = extractEmpCodeFromUserId(allocation.userId);
  if (extractedEmpCode) {
    empStatus = await getEmployeeStatus(extractedEmpCode);
  }
}
```

## Testing

To verify the fix:

1. **Check Darnell Martin specifically:**
   - Navigate to employee planner timeline
   - Find Darnell Martin
   - Verify she shows **yellow border** (Active, no user account)

2. **SQL Investigation Script:**
   ```bash
   # Run the investigation script
   cat scripts/investigate-darnell-martin.sql
   ```

3. **Check other employees:**
   - Verify employees with User accounts show **green borders**
   - Verify inactive employees show **red borders**
   - Verify active employees without accounts show **yellow borders**

## Status Indicator Colors

- 🔴 **Red Border**: `isActive=false` - Employee is inactive
- 🟡 **Yellow Border**: `isActive=true, hasUserAccount=false` - Active employee, no user account
- 🟢 **Green Border**: `isActive=true, hasUserAccount=true` - Active employee with user account

## Files Modified

1. `src/lib/utils/employeeCodeExtractor.ts` (NEW)
2. `src/lib/services/employees/employeeService.ts`
3. `src/app/api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/route.ts`
4. `src/app/api/tasks/[id]/team/allocations/route.ts`
5. `scripts/investigate-darnell-martin.sql` (NEW)

## Deployment Notes

- No database migrations required
- No breaking changes
- Cache keys unchanged
- Backward compatible with existing data

