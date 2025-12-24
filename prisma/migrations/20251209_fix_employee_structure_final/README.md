# Employee Table Dual-ID Migration

## Overview
This migration restructures the `Employee` table to follow the project's dual-ID convention.

## Changes
- **Before**: Table used `GSEmpID` (GUID) as primary key
- **After**: Table uses dual-ID pattern:
  - `id` (INT IDENTITY) - Internal primary key for application use
  - `GSEmployeeID` (UNIQUEIDENTIFIER) - External GUID for sync with external system
  - `EmpCode` (NVARCHAR) - Display/search only, NOT for relationships

## Migration Strategy
Since the Employee table is synced from an external system and had no existing data in the application database, the table was dropped and recreated with the correct structure.

## Indexes Created
- Primary key on `id`
- Unique constraint on `GSEmployeeID`
- Indexes on: `Active`, `EmpCode`, `GSEmployeeID`, `OfficeCode`, `ServLineCode`, `SLGroup`, `WinLogon`

## TypeScript Types Added
- `EmployeeId` - Branded type for internal ID
- `GSEmployeeID` - Branded type for external GUID
- Conversion functions: `toEmployeeId()`, `toGSEmployeeID()`

## Usage
```typescript
// Internal ID for application routing
const employee = await prisma.employee.findUnique({
  where: { id: employeeId } // Use internal ID
});

// External GUID for relationships with externally-synced tables
const employee = await prisma.employee.findUnique({
  where: { GSEmployeeID: externalGuid } // Use for external sync
});

// Code for display/search only
const employees = await prisma.employee.findMany({
  where: { EmpCode: { contains: searchTerm } } // Search only
});
```

## Notes
- Employee table will be populated via external system sync
- Follow dual-ID pattern for any new relationships with this table
- Use `id` for internal-only relationships
- Use `GSEmployeeID` for relationships with other externally-synced tables


























