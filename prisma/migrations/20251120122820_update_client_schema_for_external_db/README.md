# Client Schema Update for External Database Integration

## Overview
This migration updates the Client table structure to align with an external database schema while maintaining backward compatibility with legacy fields.

## Changes

### New Required Fields
- `clientCode` - Client code (NVARCHAR(10), NOT NULL, UNIQUE)
- `clientNameFull` - Full client name (NVARCHAR(255), nullable)
- `groupCode` - Group code (NVARCHAR(10), NOT NULL)
- `groupDesc` - Group description (NVARCHAR(150), NOT NULL)
- `clientPartner` - Client partner code (NVARCHAR(10), NOT NULL)
- `clientManager` - Client manager code (NVARCHAR(10), NOT NULL)
- `clientIncharge` - Client incharge code (NVARCHAR(10), NOT NULL)
- `active` - Active status (VARCHAR(3), NOT NULL)
- `clientOCFlag` - OC flag (BIT, NOT NULL)
- `rolePlayer` - Role player flag (BIT, NOT NULL)
- `typeCode` - Type code (NVARCHAR(10), NOT NULL)
- `typeDesc` - Type description (NVARCHAR(50), NOT NULL)

### New Optional Fields
- `clientDateOpen` - Client open date (DATETIME2, nullable)
- `clientDateTerminate` - Client termination date (DATETIME2, nullable)
- `sector` - Sector (NVARCHAR(255), nullable)
- `forvisMazarsIndustry` - Forvis Mazars Industry classification (NVARCHAR(255), nullable)
- `forvisMazarsSector` - Forvis Mazars Sector classification (NVARCHAR(255), nullable)
- `forvisMazarsSubsector` - Forvis Mazars Subsector classification (NVARCHAR(255), nullable)
- `clientTaxFlag` - Tax flag (BIT, nullable)
- `clientSecFlag` - SEC flag (BIT, nullable)
- `creditor` - Creditor flag (BIT, nullable)

### Legacy Fields (Retained for Backward Compatibility)
- `registrationNumber`
- `taxNumber`
- `legalEntityType`
- `jurisdiction`
- `taxRegime`
- `financialYearEnd`
- `baseCurrency`
- `primaryContact`
- `email`
- `phone`
- `address`

### Data Migration
1. Existing `name` field data is copied to `clientNameFull`
2. Default values are set for required fields where data is missing:
   - `groupCode`: 'DEFAULT'
   - `groupDesc`: 'Default Group'
   - `clientPartner`: 'TBD'
   - `clientManager`: 'TBD'
   - `clientIncharge`: 'TBD'
   - `active`: 'YES'
   - `clientOCFlag`: 0
   - `rolePlayer`: 0
   - `typeCode`: 'DEFAULT'
   - `typeDesc`: 'Default Type'
3. `clientCode` is auto-generated for existing records without codes (format: 'CL' + ID)

### Indexes Created
- `Client_clientNameFull_idx` on `clientNameFull`
- `Client_groupCode_idx` on `groupCode`
- `Client_active_idx` on `active`
- `Client_clientTaxFlag_idx` on `clientTaxFlag`

### Indexes Dropped
- `Client_name_idx` (if exists)

## Post-Migration Steps

### 1. Update Existing Records
After migration, you should update the default values with actual data from your external database:

```sql
-- Example: Update client records with actual data
UPDATE [dbo].[Client]
SET 
    [groupCode] = external_data.group_code,
    [groupDesc] = external_data.group_desc,
    [clientPartner] = external_data.partner_code,
    -- ... other fields
FROM [dbo].[Client] c
INNER JOIN [ExternalDB].[dbo].[Client] external_data 
ON c.[clientCode] = external_data.[ClientCode];
```

### 2. Application Code Updates
All application code has been updated to use `clientNameFull` instead of `name`:
- API routes (`/api/clients/`)
- Frontend components
- Validation schemas
- Search and filter logic

### 3. Future Considerations

#### Option A: Keep Legacy 'name' Column
If you want to maintain backward compatibility with external systems:
- Keep the `name` column in the schema
- Set up triggers or application logic to sync `name` with `clientNameFull`

#### Option B: Remove Legacy 'name' Column
Once all systems are updated and you've verified data integrity:

```sql
-- Remove the old 'name' column
ALTER TABLE [dbo].[Client] DROP COLUMN [name];
```

Then update the Prisma schema to remove the `name` field from the Client model.

## Rollback

If you need to rollback this migration:

```sql
-- 1. Restore 'name' column data if needed
UPDATE [dbo].[Client] SET [name] = [clientNameFull];

-- 2. Drop new columns
ALTER TABLE [dbo].[Client] DROP COLUMN 
    [clientNameFull],
    [groupCode],
    [groupDesc],
    [clientPartner],
    [clientManager],
    [clientIncharge],
    [active],
    [clientDateOpen],
    [clientDateTerminate],
    [sector],
    [forvisMazarsIndustry],
    [forvisMazarsSector],
    [forvisMazarsSubsector],
    [clientOCFlag],
    [clientTaxFlag],
    [clientSecFlag],
    [creditor],
    [rolePlayer],
    [typeCode],
    [typeDesc];

-- 3. Drop new indexes
DROP INDEX [Client_clientNameFull_idx] ON [dbo].[Client];
DROP INDEX [Client_groupCode_idx] ON [dbo].[Client];
DROP INDEX [Client_active_idx] ON [dbo].[Client];
DROP INDEX [Client_clientTaxFlag_idx] ON [dbo].[Client];

-- 4. Recreate old index
CREATE INDEX [Client_name_idx] ON [dbo].[Client]([name]);
```

## Testing Checklist

- [ ] Verify all existing clients have `clientCode` populated
- [ ] Verify `clientNameFull` contains migrated data from `name`
- [ ] Test client creation with new required fields
- [ ] Test client search and filter functionality
- [ ] Test client update operations
- [ ] Verify all frontend pages display client information correctly
- [ ] Test project-client relationships
- [ ] Verify API responses include new fields
- [ ] Test validation schemas with new field requirements

## External Database Integration

When integrating with the external database:

1. Use `clientCode` as the primary key for matching records
2. Map external database fields to the new schema fields
3. Set up a data synchronization process (ETL, API, etc.)
4. Consider implementing a stored procedure or trigger for ongoing sync
5. Validate data integrity after initial sync

## Support

For questions or issues related to this migration, contact the development team.




