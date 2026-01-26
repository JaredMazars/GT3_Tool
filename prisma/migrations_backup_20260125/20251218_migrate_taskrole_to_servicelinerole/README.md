# TaskRole to ServiceLineRole Migration

**Date:** December 18, 2024

## Purpose

This migration converts the deprecated TaskRole system to the ServiceLineRole system for all task team assignments. Instead of having separate task-specific roles (ADMIN, REVIEWER, EDITOR, VIEWER), task team members now use their ServiceLineRole from the task's sub-service line group.

## Changes

### Database Updates

1. **TaskTeam.role field conversion:**
   - Old values: `ADMIN`, `REVIEWER`, `EDITOR`, `VIEWER` (TaskRole)
   - New values: `ADMINISTRATOR`, `PARTNER`, `MANAGER`, `SUPERVISOR`, `USER`, `VIEWER` (ServiceLineRole)

### Migration Logic

For each TaskTeam record:
1. Get the task's ServLineCode
2. Map ServLineCode to SubServlineGroupCode via ServiceLineExternal
3. Look up the user's ServiceLineRole for that SubServlineGroupCode
4. Update TaskTeam.role with the user's ServiceLineRole
5. If no ServiceLineRole found, default to `USER`

### Impact

- **All existing TaskTeam records** will have their `role` field updated
- Users will have the same role on tasks as they do in the task's service line
- No data loss - all assignments are preserved, only role values change

## Rollback

⚠️ **This migration is destructive and cannot be automatically rolled back.**

To manually rollback:
1. Restore from database backup taken before migration
2. Redeploy previous application version that uses TaskRole

## Testing

After migration, verify:
- [ ] All TaskTeam records have valid ServiceLineRole values
- [ ] No TaskTeam records have old TaskRole values (ADMIN, REVIEWER, EDITOR, VIEWER)
- [ ] Users can access tasks they were previously assigned to
- [ ] Role-based permissions work correctly

## Notes

- This migration is part of a larger refactoring to eliminate the TaskRole system
- Frontend and backend code changes are deployed separately
- Ensure application code is updated before running this migration





















