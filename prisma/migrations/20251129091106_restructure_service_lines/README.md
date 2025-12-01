# Restructure Service Lines Migration

## Overview
This migration restructures the service line tables to support both application-level master service lines and external database service lines with proper mapping between them.

## Changes

### 1. Rename ServiceLine to ServiceLineExternal
The existing `ServiceLine` table (which contains external database fields) is renamed to `ServiceLineExternal` to better reflect its purpose.

### 2. Add masterCode Column
Adds a `masterCode` column to `ServiceLineExternal` to map external service lines to master service lines.

### 3. Create ServiceLineMaster Table
Creates a new `ServiceLineMaster` table with application-level service line definitions:
- `code` (PK): Service line code (TAX, AUDIT, etc.)
- `name`: Display name
- `description`: Description text
- `active`: Active status flag
- `sortOrder`: Sort order for display

### 4. Populate Default Service Lines
Inserts the default application service lines:
- TAX - Tax Services
- AUDIT - Audit & Assurance
- ACCOUNTING - Accounting
- ADVISORY - Advisory
- QRM - Quality & Risk Management
- BUSINESS_DEV - Business Development
- IT - Information Technology
- FINANCE - Finance
- HR - Human Resources

## Architecture

### ServiceLineMaster
Contains the canonical list of service lines used throughout the application. This is the source of truth for service line codes used in projects, permissions, and access control.

### ServiceLineExternal
Contains service lines from the external database system. These can be mapped to master service lines via the `masterCode` field, allowing multiple external service lines to map to a single master service line.

## Data Migration Notes

After running this migration:
1. All existing service line references in the application will use `ServiceLineMaster`
2. External service lines from the external DB will be stored in `ServiceLineExternal`
3. A mapping utility will be provided to sync and map external service lines to master service lines

## Rollback

To rollback this migration:
1. Drop the `ServiceLineMaster` table
2. Remove the `masterCode` column from `ServiceLineExternal`
3. Rename `ServiceLineExternal` back to `ServiceLine`
4. Drop the indexes created

Note: This rollback would lose any master service line data and mappings created.







