# Permission System Migration

## Overview
This migration adds a comprehensive role-based access control (RBAC) system with a permission matrix for managing granular access control.

## Changes

### New Tables

#### Permission
Stores all available permissions in the system (both page-level and feature-level).
- `resourceType`: Type of resource (PAGE or FEATURE)
- `resourceKey`: Unique identifier for the resource (e.g., "clients", "projects.create")
- `displayName`: Human-readable name
- `description`: Optional description
- `availableActions`: JSON array of CRUD operations available for this resource

#### RolePermission
Links roles to permissions with specific allowed actions.
- `role`: User role (PARTNER, MANAGER, SUPERVISOR, ADMIN, USER, VIEWER, SYSTEM_ADMIN)
- `permissionId`: Foreign key to Permission table
- `allowedActions`: JSON array of allowed CRUD operations for this role-permission pair

## Supported Roles

1. **SYSTEM_ADMIN**: System admin with full access (bypasses all permission checks)
2. **ADMIN**: Full CRUD + admin pages (users, templates, service lines)
3. **PARTNER**: Full CRUD across service lines, limited admin access
4. **MANAGER**: Full CRUD on service line, READ on other areas
5. **SUPERVISOR**: READ/UPDATE on service line projects, CREATE projects
6. **USER**: READ on all, CREATE/UPDATE on assigned projects
7. **VIEWER**: READ-only on most pages

## Usage

After running this migration:
1. Run the seed script: `npm run seed-permissions`
2. Assign appropriate roles to existing users
3. The permission system will automatically enforce access control

## Rollback

To rollback this migration:
```sql
DROP TABLE [RolePermission];
DROP TABLE [Permission];
```

## Notes
- SYSTEM_ADMIN role maintains backward compatibility with existing behavior
- Existing role field in User table supports all new role types
- Permission checks are enforced in API routes and UI components













