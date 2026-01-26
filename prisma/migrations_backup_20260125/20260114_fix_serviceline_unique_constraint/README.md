# Fix ServiceLineUser Unique Constraint

## Problem
The current `ServiceLineUser` table has a unique constraint on `(userId, subServiceLineGroup)`. This prevents users from being assigned to multiple service lines that share the same sub-service line group code.

For example, all shared services (QRM, IT, FINANCE, HR, BUSINESS_DEV) use the sub-group code "Adm". With the current constraint:
- User can only have ONE "Adm" assignment at a time
- Adding QRM, then IT, then FINANCE results in only FINANCE being stored (each one overwrites the previous)
- Deleting QRM deletes the "Adm" record, removing ALL shared services

## Solution
1. Add `masterCode` column to `ServiceLineUser` to track which master service line each assignment belongs to
2. Change unique constraint from `(userId, subServiceLineGroup)` to `(userId, subServiceLineGroup, masterCode)`
3. This allows multiple assignments to the same sub-group, differentiated by master code

## Impact
- **Breaking Change**: Requires updating all queries that create/update `ServiceLineUser` records to include `masterCode`
- **Data Migration**: Existing records will have `NULL` masterCode and need to be backfilled
- **Code Changes**: `grantServiceLineAccess`, `revokeServiceLineAccess`, and `updateServiceLineRole` functions need updates

## Rollback
If issues occur, the constraint can be reverted with:
```sql
DROP INDEX [ServiceLineUser_userId_subServiceLineGroup_masterCode_key];
ALTER TABLE [dbo].[ServiceLineUser] DROP COLUMN masterCode;
CREATE UNIQUE INDEX [ServiceLineUser_userId_subServiceLineGroup_key]
ON [dbo].[ServiceLineUser]([userId], [subServiceLineGroup]);
```
