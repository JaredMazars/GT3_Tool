# Migration: Add SUPERUSER Role

## Purpose

This migration introduces a clear distinction between system-level and service-line-level roles:

- **User.role** (System Level)
  - `SUPERUSER`: System-wide access to all features and service lines
  - `USER`: Regular user, requires service line access

- **ServiceLineUser.role** (Service Line Level)
  - `ADMIN`: Partner - can approve acceptance/engagement letters
  - `MANAGER`: Manager - can manage projects
  - `USER`: Staff - can complete work
  - `VIEWER`: View-only access

- **ProjectUser.role** (Project Level)
  - `ADMIN`: Full project control
  - `REVIEWER`: Can review and comment
  - `EDITOR`: Can edit project data
  - `VIEWER`: Read-only project access

## Changes

1. Updates existing `User` records with `role = 'ADMIN'` to `role = 'SUPERUSER'`
2. This preserves the intent of system-level administrative access
3. Schema comments added to document the role hierarchy

## Authorization Rules

- **Acceptance & Engagement Letter Approval**: SUPERUSER OR Partner (ServiceLineUser.role = ADMIN for project's service line)
- **Service Line Access Check**: Superusers bypass; Partners/Managers/Staff require service line access
- **Project Access**: All users must be assigned to projects via ProjectUser

## Impact

- Existing system administrators will automatically become SUPERUSERs
- No impact on ServiceLineUser or ProjectUser roles
- Authentication and authorization logic updated to respect the new hierarchy

