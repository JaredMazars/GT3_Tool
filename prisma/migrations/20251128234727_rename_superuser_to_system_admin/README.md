# Migration: Rename SUPERUSER to SYSTEM_ADMIN

## Purpose

This migration renames the `SUPERUSER` role to `SYSTEM_ADMIN` for better clarity and consistency across the application. The term "System Administrator" more clearly communicates the intent and scope of the role.

## What Changed

### Database Changes

1. **User Role Update**: All existing User records with `role = 'SUPERUSER'` are updated to `role = 'SYSTEM_ADMIN'`
2. **Constraint Addition**: Added check constraint `CK_User_SystemRole` to ensure only valid system roles ('SYSTEM_ADMIN' or 'USER') can be stored

### Role Hierarchy (Unchanged)

- **User.role** (System Level)
  - `SYSTEM_ADMIN`: System-wide access to all features and service lines
  - `USER`: Regular user, requires service line access

- **ServiceLineUser.role** (Service Line Level)
  - `ADMINISTRATOR`: Service line administrator
  - `PARTNER`: Partner - can approve acceptance/engagement letters
  - `MANAGER`: Manager - can manage projects
  - `SUPERVISOR`: Supervisor - between Manager and User
  - `USER`: Staff - can complete work
  - `VIEWER`: View-only access

- **ProjectUser.role** (Project Level)
  - `ADMIN`: Full project control
  - `REVIEWER`: Can review and comment
  - `EDITOR`: Can edit project data
  - `VIEWER`: Read-only project access

## Authorization Rules (Unchanged)

- **Acceptance & Engagement Letter Approval**: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = PARTNER or ADMINISTRATOR for project's service line)
- **Service Line Access Check**: System Admins bypass; others require service line access
- **Project Access**: All users must be assigned to projects via ProjectUser

## Impact

- Existing users with SUPERUSER role will automatically become SYSTEM_ADMIN
- No impact on ServiceLineUser or ProjectUser roles
- No functional changes to authorization logic
- Code updated to use SYSTEM_ADMIN terminology throughout

## Rollback

To rollback this migration:

```sql
UPDATE [User] SET role = 'SUPERUSER' WHERE role = 'SYSTEM_ADMIN';
ALTER TABLE [User] DROP CONSTRAINT CK_User_SystemRole;
```

## Related Changes

This migration is part of a broader terminology update:
- Code files updated to use `SYSTEM_ADMIN` instead of `SUPERUSER`
- Documentation updated to reflect new terminology
- UI displays "System Administrator" instead of "Superuser"



