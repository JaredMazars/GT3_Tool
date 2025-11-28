# Deprecated Code Index

This file lists all deprecated functions and their recommended replacements. Use this as a reference when refactoring or reviewing code.

## Utility Functions

### src/lib/utils/projectUtils.ts

```typescript
// ❌ DEPRECATED
formatProjectType(type: string): string
// ✅ USE INSTEAD
import { formatProjectType } from '@/lib/utils/serviceLineUtils';

// ❌ DEPRECATED
getProjectTypeColor(type: string): string
// ✅ USE INSTEAD
import { getProjectTypeColor } from '@/lib/utils/serviceLineUtils';

// ❌ DEPRECATED
formatSystemRole(role: string): string
// ✅ USE INSTEAD
import { formatSystemRole } from '@/lib/utils/permissionUtils';

// ❌ DEPRECATED
getSystemRoleDescription(role: string): string
// ✅ USE INSTEAD
import { getSystemRoleDescription } from '@/lib/utils/permissionUtils';

// ❌ DEPRECATED
getRoleBadgeColor(role: string): string
// ✅ USE INSTEAD
import { getRoleBadgeColor } from '@/lib/utils/permissionUtils';

// ❌ DEPRECATED
getProjectTypeOptions()
// ✅ USE INSTEAD
import { getProjectTypesForServiceLine } from '@/lib/utils/serviceLineUtils';
```

### src/lib/services/auth/authorization.ts

```typescript
// ❌ DEPRECATED
formatServiceLineRole(role: string): string
// ✅ USE INSTEAD
import { formatServiceLineRole } from '@/lib/utils/permissionUtils';

// ❌ DEPRECATED
formatSystemRole(role: string): string
// ✅ USE INSTEAD
import { formatSystemRole } from '@/lib/utils/permissionUtils';

// ❌ DEPRECATED
getUserServiceLines(userId: string): Promise<Array<{ serviceLine: string; role: string }>>
// ✅ USE INSTEAD
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
// Returns: Promise<ServiceLineWithStats[]> - enhanced with project counts

// ❌ DEPRECATED
getServiceLineRole(userId: string, serviceLine: string): Promise<ServiceLineRole | null>
// ✅ USE INSTEAD
import { getServiceLineRole } from '@/lib/services/service-lines/serviceLineService';
// Returns: Promise<ServiceLineRole | string | null> - more flexible typing

// ❌ DEPRECATED
hasServiceLineAccess(userId: string, serviceLine: string): Promise<boolean>
// ✅ USE INSTEAD
import { checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
// Supports role hierarchy checking with optional requiredRole parameter
```

### src/lib/api/middleware.ts

```typescript
// ❌ DEPRECATED - NEVER USED
withAuth<TParams, TResponse>(handler: AuthenticatedHandler<TParams, TResponse>)
// ✅ USE INSTEAD
// Manual authentication in each route:
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// ❌ DEPRECATED - NEVER USED
withProjectAccess<TParams, TResponse>(requiredRole?: string)
// ✅ USE INSTEAD
// Manual authorization:
const hasAccess = await checkProjectAccess(user.id, projectId, requiredRole);
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// ❌ DEPRECATED - NEVER USED
withServiceLineAccess<TParams, TResponse>(requiredRole?: ServiceLineRole | string)
// ✅ USE INSTEAD
// Manual service line check:
const hasAccess = await checkServiceLineAccess(user.id, serviceLine, requiredRole);
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// ❌ DEPRECATED - NEVER USED
validateBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T>
// ✅ USE INSTEAD
// Parse directly:
const body = await request.json();
const validated = schema.parse(body);
```

### src/lib/utils/responseHelpers.ts

```typescript
// ❌ DEPRECATED - NEVER USED
okResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse<SuccessResponse<T>>
// ✅ USE INSTEAD
import { successResponse } from '@/lib/utils/apiUtils';
return NextResponse.json(successResponse(data, meta));
```

## Type Definitions

### Centralized Types in src/types/index.ts

```typescript
// ✅ USE THESE CENTRALIZED TYPES
import { TaxAdjustment, TaxAdjustmentDisplay, AdjustmentDocument } from '@/types';

// ❌ DON'T DEFINE LOCALLY IN COMPONENTS/PAGES
// Found in 10 files - should be refactored to use centralized types
```

### Files with Local TaxAdjustment Definitions (TODO: Refactor)

1. `src/hooks/projects/useProjectData.ts`
2. `src/app/dashboard/projects/[id]/tax-calculation/page.tsx`
3. `src/app/dashboard/projects/[id]/tax-calculation/adjustments/page.tsx`
4. `src/app/dashboard/projects/[id]/reporting/page.tsx`
5. `src/lib/services/export/serverPdfExporter.ts`
6. `src/lib/services/export/excelExporter.ts`
7. `src/components/features/tax-adjustments/TaxAdjustmentCard.tsx`
8. `src/components/features/reports/TaxCalculationReport.tsx`
9. `src/app/dashboard/projects/[id]/tax-calculation/adjustments/[adjustmentId]/page.tsx`
10. `src/app/api/projects/[id]/tax-calculation/route.ts`

## Migration Patterns

### Before (Redundant)
```typescript
// Multiple files had this duplicated:
function formatProjectType(type: string): string {
  const typeMap: Record<string, string> = {
    TAX_CALCULATION: 'Tax Calculation',
    // ... etc
  };
  return typeMap[type] || type;
}
```

### After (Consolidated)
```typescript
// Import from canonical location:
import { formatProjectType } from '@/lib/utils/serviceLineUtils';

// Use directly:
const displayName = formatProjectType(project.projectType);
```

## Quick Migration Checklist

When updating old code:
- [ ] Check for local utility function definitions
- [ ] Search this file for the function name
- [ ] If deprecated, update to use recommended import
- [ ] Remove local definition
- [ ] Test that functionality still works

## Deprecated Function Count by File

- `projectUtils.ts`: 6 deprecated functions
- `authorization.ts`: 5 deprecated functions
- `middleware.ts`: 4 deprecated functions
- `responseHelpers.ts`: 1 deprecated function
- `api.ts`: 4 deprecated types

**Total**: 20 deprecated items marked for future removal

## Safe Removal Timeline

**Now (Immediate)**:
- All imports already updated
- All deprecated functions still work
- No breaking changes

**2-4 Weeks**:
- Monitor production for any issues
- Validate all updated imports work correctly
- Confirm TypeScript build succeeds

**After Validation**:
- Remove deprecated functions
- Clean up imports
- Update any remaining usages

## Need Help?

- **Full Details**: See `REDUNDANCY_CLEANUP_LOG.md`
- **Implementation Summary**: See `REDUNDANCY_IMPLEMENTATION_SUMMARY.md`
- **Original Audit**: See `redundant-code-audit.plan.md`














