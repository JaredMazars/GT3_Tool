# Redundancy Cleanup - Quick Reference Guide

## What Was Done

This cleanup consolidated and marked redundant code across the codebase while maintaining full backward compatibility.

## Canonical Locations for Common Functions

Use these imports going forward:

```typescript
// Project Type Formatting
import { formatProjectType, getProjectTypeColor } from '@/lib/utils/serviceLineUtils';

// Role Formatting and Permissions
import { 
  formatServiceLineRole, 
  formatSystemRole, 
  getRoleBadgeColor,
  getServiceLineRoleOptions,
  getSystemRoleOptions,
  getSystemRoleDescription 
} from '@/lib/utils/permissionUtils';

// Project Utilities (dates, role display)
import { formatDate, formatDateTime, formatRole } from '@/lib/utils/projectUtils';

// Currency/Amount Formatting
import { formatAmount } from '@/lib/utils/formatters';

// Service Line Access (use these, not authorization.ts versions)
import { 
  getUserServiceLines,      // Returns ServiceLineWithStats[]
  getServiceLineRole,        // More flexible typing
  checkServiceLineAccess     // Includes role hierarchy
} from '@/lib/services/service-lines/serviceLineService';

// API Response Helpers
import { successResponse } from '@/lib/utils/apiUtils';  // NOT okResponse from responseHelpers

// ID Parsing (now uses generic function internally)
import { parseProjectId, parseAdjustmentId, parseDocumentId } from '@/lib/utils/apiUtils';

// Type Definitions
import { TaxAdjustment, TaxAdjustmentDisplay, AdjustmentDocument } from '@/types';
```

## Deprecated Functions to Avoid

### In `projectUtils.ts` - DO NOT USE
- ❌ `formatProjectType()` → Use from `serviceLineUtils.ts`
- ❌ `getProjectTypeColor()` → Use from `serviceLineUtils.ts`
- ❌ `formatSystemRole()` → Use from `permissionUtils.ts`
- ❌ `getSystemRoleDescription()` → Use from `permissionUtils.ts`
- ❌ `getRoleBadgeColor()` → Use from `permissionUtils.ts`
- ❌ `getProjectTypeOptions()` → Use `getProjectTypesForServiceLine()` from `serviceLineUtils.ts`

### In `authorization.ts` - DO NOT USE
- ❌ `formatServiceLineRole()` → Use from `permissionUtils.ts`
- ❌ `formatSystemRole()` → Use from `permissionUtils.ts`
- ❌ `getUserServiceLines()` → Use from `serviceLineService.ts`
- ❌ `getServiceLineRole()` → Use from `serviceLineService.ts`
- ❌ `hasServiceLineAccess()` → Use `checkServiceLineAccess()` from `serviceLineService.ts`

### In `middleware.ts` - DO NOT USE
- ❌ `withAuth()` → Use manual `getCurrentUser()` check instead
- ❌ `withProjectAccess()` → Use manual `checkProjectAccess()` instead
- ❌ `withServiceLineAccess()` → Use manual `checkServiceLineAccess()` instead
- ❌ `validateBody()` → Parse request body directly with schema

### In `responseHelpers.ts` - DO NOT USE
- ❌ `okResponse()` → Use `successResponse()` from `apiUtils.ts`

### In Component Files - DO NOT DEFINE LOCALLY
- ❌ Local `formatCurrency()` functions → Use `formatAmount()` from `formatters.ts`
- ❌ Local `formatRole()` functions → Use from `projectUtils.ts`
- ❌ Local `formatProjectType()` functions → Use from `serviceLineUtils.ts`

## Best Practices Going Forward

### 1. Always Check for Existing Utilities
Before creating a new utility function, search for existing implementations:
```bash
# Search for similar function names
grep -r "functionName" src/lib/utils/
```

### 2. Import from Canonical Locations
- **Formatting**: `formatters.ts`, `serviceLineUtils.ts`, `permissionUtils.ts`
- **API Utilities**: `apiUtils.ts`
- **Service Line Logic**: `serviceLineService.ts`
- **Authorization**: `authorization.ts` (for high-level permission checks)
- **Types**: `@/types` (never define types locally if they match DB models)

### 3. Follow Project Conventions
- **Authentication**: Manual `getCurrentUser()` check in each route (NOT middleware)
- **Authorization**: Use service-specific authorization functions
- **Response Format**: Use `successResponse()` from `apiUtils.ts`
- **Error Handling**: Use `handleApiError()` in catch blocks

### 4. Type Definitions
```typescript
// ✅ GOOD - Import from centralized types
import { TaxAdjustment, MappedData } from '@/types';

// ❌ BAD - Defining locally
interface TaxAdjustment {
  id: number;
  // ...
}
```

### 5. Formatting Functions
```typescript
// ✅ GOOD - Import from canonical location
import { formatAmount } from '@/lib/utils/formatters';

// ❌ BAD - Defining locally
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(value);
};
```

## Deprecation Timeline

### Phase 1 (Current) - Deprecation Markers
- ✅ All duplicate functions marked with `@deprecated` tags
- ✅ Functions kept functional for backward compatibility
- ✅ New code should use canonical locations

### Phase 2 (2-4 weeks) - Validation
- Test all functionality in production
- Monitor for any issues with updated imports
- Verify no TypeScript errors in CI/CD

### Phase 3 (After Validation) - Removal
- Remove deprecated functions from codebase
- Update any remaining usages
- Clean up import statements

## Quick Wins Achieved

1. **Reduced Code Duplication**: ~200+ lines of duplicate code removed or consolidated
2. **Improved Maintainability**: Single source of truth for common functions
3. **Better Organization**: Clear canonical locations for utilities
4. **Type Safety**: Centralized type definitions
5. **Clean Archive**: Migration scripts properly archived

## Files That Can Be Fully Deleted Later

After Phase 3 validation:
- None (all files still serve a purpose, just individual deprecated functions within them)

After confirming migration scripts have run in all environments:
- `scripts/archive/approve-existing-projects.ts` (can be permanently deleted)
- `scripts/archive/migrate-admin-to-superuser.ts` (can be permanently deleted)

## Questions? Issues?

If you encounter any issues related to this cleanup:
1. Check this quick reference for the canonical location
2. Review `REDUNDANCY_CLEANUP_LOG.md` for detailed changes
3. Check Git history for before/after comparisons
4. All deprecated functions are still available if needed

## Summary Statistics

- **Functions Deprecated**: 16
- **Functions Removed**: 7
- **Functions Consolidated**: 3 (ID parsers)
- **Type Definitions Added**: 3
- **Files Modified**: 21
- **Files Archived**: 2
- **Import Statements Updated**: 8
- **Lines of Code Reduced**: ~430
- **Breaking Changes**: 0














