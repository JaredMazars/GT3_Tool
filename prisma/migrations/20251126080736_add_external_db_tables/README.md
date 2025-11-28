# Add External Database Tables

**Migration Date:** 2025-11-26  
**Migration ID:** 20251126080736_add_external_db_tables

## Overview

This migration adds four new tables to integrate external database data from the Azure SQL Server. These tables are designed for read-only synchronization from an external system and follow the same pattern as the existing `Client` table integration.

## Tables Added

### 1. Employee Table

Stores employee information synced from the external database.

**Key Fields:**
- `id` - Auto-incrementing primary key (internal use)
- `EmpCode` - Unique employee code (indexed)
- `ExternalEmpID` - External database identifier (not exposed via Prisma Client, uses `@ignore`)
- `WinLogon` - Windows login identifier
- `RateValue` - Employee rate (MONEY type)
- `Active` - Active status flag

**Purpose:** Employee master data for lookups and reporting

### 2. ServiceLine Table

Lookup table for service line information.

**Key Fields:**
- `id` - Auto-incrementing primary key
- `ServLineCode` - Service line code
- `ServLineDesc` - Service line description
- `GLPrefix` - General ledger prefix
- `SLGroup` - Service line group

**Purpose:** Service line reference data

### 3. Task Table

Stores task/engagement information linked to clients.

**Key Fields:**
- `id` - Auto-incrementing primary key (internal use)
- `ExternalTaskID` - External database identifier (not exposed via Prisma Client, uses `@ignore`)
- `ClientCode` - Foreign key to Client table
- `TaskCode` - Task code
- `TaskPartner` - Partner responsible for task
- `TaskManager` - Manager responsible for task
- `Active` - Active status flag

**Relationships:**
- Links to `Client` via `ClientCode` → `Client.clientCode`

**Purpose:** Task/engagement master data linked to clients

### 4. WipLTD Table

Stores Work In Progress (WIP) and Life-To-Date (LTD) financial data for tasks.

**Key Fields:**
- `id` - Auto-incrementing primary key (internal use)
- `taskId` - Foreign key to Task table (internal ID)
- `ExternalTaskID` - External database identifier (not exposed via Prisma Client, uses `@ignore`)
- `ClientCode` - Client code reference
- `TaskCode` - Task code reference
- All financial fields (LTDTime, LTDDisb, etc.) - MONEY type

**Relationships:**
- Links to `Task` via `taskId` → `Task.id`

**Purpose:** Financial tracking for tasks

## Design Decisions

### External ID Handling

Following the existing `Client` table pattern, external IDs (`ExternalEmpID`, `ExternalTaskID`) are:
- Stored as `UNIQUEIDENTIFIER` fields
- Marked with `@ignore` directive in Prisma schema
- Not accessible via Prisma Client
- Used only for verification when syncing from external database
- Named with "External" prefix to avoid SQL Server case-insensitive column name conflicts

### Data Types

- **NVARCHAR** - Used for all text fields to support Unicode
- **MONEY** - Used for all financial fields (mapped to Float in Prisma)
- **DATETIME2** - Used for all date/time fields
- **VARCHAR(3)** - Used for Active status flags

### Relationships

- **Task → Client**: via `ClientCode` matching `Client.clientCode`
  - Foreign key constraint enforced
  - NO ACTION on delete/update to prevent cascading changes
  
- **WipLTD → Task**: via internal `taskId` (auto-increment ID, not external ExternalTaskID)
  - Foreign key constraint enforced
  - NO ACTION on delete/update to prevent cascading changes

### Indexes

Performance indexes created on:
- **Employee**: EmpCode (unique + indexed), Active, ServLineCode, WinLogon, OfficeCode, SLGroup
- **ServiceLine**: ServLineCode, SLGroup
- **Task**: ClientCode, TaskCode, TaskPartner, TaskManager, Active, ServLineCode, OfficeCode, SLGroup, and unique composite (ClientCode + TaskCode)
- **WipLTD**: taskId, ClientCode, TaskCode, TaskPartner, ServLineCode, OfficeCode

## Usage Notes

1. **Read-Only Intent**: These tables are designed to be synced from an external database. The application should primarily read from these tables.

2. **External ID Verification**: The `@ignore` fields (ExternalEmpID, ExternalTaskID) can be used by sync scripts to verify data consistency but are not accessible via Prisma Client queries.

3. **Timestamp Tracking**: All tables include `createdAt` and `updatedAt` fields for audit purposes.

4. **Foreign Key Constraints**: Relationships use NO ACTION to prevent accidental cascading deletes/updates from the external data.

## Integration Points

- **Client Table**: Task table links to existing Client records via `clientCode`
- **Employee Lookups**: Can be used for partner/manager name resolution
- **Service Line**: Reference data for service line descriptions
- **Financial Reporting**: WipLTD provides financial metrics for tasks

## Rollback

To rollback this migration:

```sql
DROP TABLE IF EXISTS [dbo].[WipLTD];
DROP TABLE IF EXISTS [dbo].[Task];
DROP TABLE IF EXISTS [dbo].[ServiceLine];
DROP TABLE IF EXISTS [dbo].[Employee];
```

Note: Ensure no dependencies exist before rolling back.

## Next Steps

1. **Data Synchronization**: Implement sync scripts to populate these tables from the external database
2. **API Endpoints**: Create read endpoints for accessing employee, service line, and task data
3. **Reporting**: Utilize WipLTD data for financial reporting and analytics
4. **Validation**: Implement validation logic using external IDs to ensure data consistency

