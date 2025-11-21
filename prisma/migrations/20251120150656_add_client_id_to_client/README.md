# Add ClientID to Client Table

## Overview
Adds a `ClientID` uniqueidentifier field to the Client table.

## Changes
- Adds `ClientID` column as a `uniqueidentifier NOT NULL` field with `DEFAULT NEWID()`
- Creates a unique index on `ClientID` for uniqueness constraint
- Field is marked as `@ignore` in Prisma schema (database-only, not exposed to application)

## Purpose
The `ClientID` field provides a unique identifier for each client that is managed at the database level only. This field is not exposed through the Prisma Client or API layer.

## Notes
- Existing records will automatically receive a UUID value via the `DEFAULT NEWID()` constraint
- Future inserts will auto-generate UUIDs
- Field is database-only and won't appear in TypeScript types or API responses




