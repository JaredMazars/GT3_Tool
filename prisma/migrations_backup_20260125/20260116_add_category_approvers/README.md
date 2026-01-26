# Add Category Approvers Migration

**Date**: 2026-01-16  
**Purpose**: Add approval people selection to document vault categories

## What This Migration Does

Creates the `CategoryApprover` table to enable assigning specific users as approvers for document vault categories. When documents are uploaded to categories with assigned approvers, they automatically trigger sequential approval workflows.

## Tables Created

### CategoryApprover

Links document vault categories to approving users with sequential ordering.

**Columns**:
- `id` (INT, PK) - Auto-incrementing primary key
- `categoryId` (INT, FK) - References VaultDocumentCategory.id
- `userId` (NVARCHAR(450), FK) - References User.id (the approver)
- `stepOrder` (INT) - Order in approval sequence (1, 2, 3, etc.)
- `createdAt` (DATETIME2) - Timestamp when approver was assigned
- `createdBy` (NVARCHAR(450), FK) - References User.id (who assigned the approver)

**Constraints**:
- Primary key on `id`
- Unique constraint on `(categoryId, userId)` - prevents duplicate assignments
- Foreign key to VaultDocumentCategory with CASCADE delete
- Foreign key to User (userId) with CASCADE delete
- Foreign key to User (createdBy) with no cascade

**Indexes**:
- `IX_CategoryApprover_CategoryId` - For looking up approvers by category
- `IX_CategoryApprover_UserId` - For looking up categories by user
- `IX_CategoryApprover_CategoryId_StepOrder` - For retrieving approvers in order

## Workflow Impact

### Before Migration
- Documents could be uploaded to any category
- No approval workflow for document vault

### After Migration
- Admins can assign approvers to categories
- Documents uploaded to categories with approvers trigger sequential approval
- Categories without approvers block document uploads (validation at API level)
- Each approver must approve in order (Step 1, then Step 2, etc.)

## Usage

### Assign Approvers to Category
```sql
-- Example: Assign two approvers to a category
INSERT INTO CategoryApprover (categoryId, userId, stepOrder, createdBy)
VALUES 
  (1, 'user-id-1', 1, 'admin-id'),  -- First approver
  (1, 'user-id-2', 2, 'admin-id');  -- Second approver
```

### Query Category Approvers
```sql
-- Get all approvers for a category in order
SELECT ca.*, u.name, u.email
FROM CategoryApprover ca
INNER JOIN [User] u ON ca.userId = u.id
WHERE ca.categoryId = 1
ORDER BY ca.stepOrder ASC;
```

### Count Documents Per Category with Approver Status
```sql
-- Check categories without approvers
SELECT 
  vdc.id,
  vdc.name,
  COUNT(DISTINCT vd.id) as documentCount,
  COUNT(DISTINCT ca.id) as approverCount
FROM VaultDocumentCategory vdc
LEFT JOIN VaultDocument vd ON vd.categoryId = vdc.id
LEFT JOIN CategoryApprover ca ON ca.categoryId = vdc.id
GROUP BY vdc.id, vdc.name
HAVING COUNT(DISTINCT ca.id) = 0;
```

## Data Migration Notes

**IMPORTANT**: After running this migration:

1. **All existing categories will have 0 approvers**
2. **Document uploads will be blocked** until approvers are assigned
3. **Action required**: Admins must assign approvers to active categories

### Post-Migration Steps

1. Identify active categories:
```sql
SELECT id, name, documentType, active
FROM VaultDocumentCategory
WHERE active = 1;
```

2. Assign approvers to each active category via admin UI or SQL

3. Verify all active categories have approvers:
```sql
SELECT 
  vdc.id,
  vdc.name,
  COUNT(ca.id) as approverCount
FROM VaultDocumentCategory vdc
LEFT JOIN CategoryApprover ca ON ca.categoryId = vdc.id
WHERE vdc.active = 1
GROUP BY vdc.id, vdc.name
HAVING COUNT(ca.id) = 0;
```

## Rollback

To rollback this migration:

```sql
DROP TABLE IF EXISTS [dbo].[CategoryApprover];
```

Note: This will remove all approver assignments. Document vault will revert to previous behavior (no approval workflow).

## Related Files

- Schema: `prisma/schema.prisma` - CategoryApprover model
- API: `src/app/api/admin/document-vault/categories/[id]/approvers/route.ts`
- UI: `src/components/features/document-vault/CategoryApproverModal.tsx`
- Types: `src/types/documentVault.ts` - CategoryApprover interface

## Testing

After migration:

1. Verify table creation:
```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME = 'CategoryApprover';
```

2. Verify indexes:
```sql
SELECT * FROM sys.indexes 
WHERE object_id = OBJECT_ID('CategoryApprover');
```

3. Test constraints:
```sql
-- Should fail: duplicate user for same category
INSERT INTO CategoryApprover (categoryId, userId, stepOrder, createdBy)
VALUES (1, 'user-1', 1, 'admin-1'), (1, 'user-1', 2, 'admin-1');
```
