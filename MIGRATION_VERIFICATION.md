# Migration Verification - Enhanced Multi-Project User Management

## ✅ Migration Status: COMPLETED

The database schema has been successfully updated with all planned enhancements.

## What Was Applied

### 1. ✅ New Client Table Created
The `Client` model is now in the database with all fields:
- id (primary key)
- name, registrationNumber, taxNumber
- industry, legalEntityType, jurisdiction, taxRegime
- financialYearEnd, baseCurrency (default: ZAR)
- primaryContact, email, phone, address
- createdAt, updatedAt
- Index on `name`

### 2. ✅ Project Table Enhanced
The `Project` model now includes:
- **projectType** (default: TAX_CALCULATION)
- **taxYear** (integer)
- **taxPeriodStart** (datetime)
- **taxPeriodEnd** (datetime)
- **assessmentYear** (string, e.g., "2024/2025")
- **submissionDeadline** (datetime)
- **clientId** (foreign key to Client)

**New Indexes Added:**
- clientId
- projectType
- taxYear
- status (already existed)

### 3. ✅ ProjectUser Role System Updated
The `ProjectUser` model's role field is configured as String (VIEWER, EDITOR, REVIEWER, ADMIN).

**Note:** If you had any existing projects with users in "OWNER" role, you should manually update them to "ADMIN":
```sql
UPDATE ProjectUser SET role = 'ADMIN' WHERE role = 'OWNER';
```

## Database Tables Now Available

1. **Client** - Store client/organization information
2. **Project** - Enhanced with project types, tax details, and client relationship
3. **ProjectUser** - Updated role system
4. **User** - Authentication (existing)
5. **Account** - OAuth accounts (existing)
6. **Session** - User sessions (existing)
7. **MappedAccount** - Account mappings (existing)
8. **TaxAdjustment** - Tax adjustments (existing)
9. **AdjustmentDocument** - Supporting documents (existing)
10. **AITaxReport** - AI-generated reports (existing)
11. **VerificationToken** - Email verification (existing)

## Next Steps

### 1. Test the New Features

**Create a Client:**
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client Ltd",
    "taxNumber": "12345678",
    "baseCurrency": "ZAR"
  }'
```

**Create a Project with Client:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tax Calculation 2024",
    "projectType": "TAX_CALCULATION",
    "taxYear": 2024,
    "clientId": 1
  }'
```

### 2. Configure Azure AD for User Search

Make sure your Azure AD application has the `User.Read.All` permission:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your application
3. Go to API permissions
4. Add permission → Microsoft Graph → Application permissions
5. Search for and add `User.Read.All`
6. Click "Grant admin consent"

### 3. Test User Management

Once logged in to the application:
- Navigate to a project
- Look for the "Team" or "Users" section
- Click "Add User"
- Search for users from your Active Directory
- Assign roles (ADMIN, REVIEWER, EDITOR, VIEWER)

### 4. Update Existing Projects (if any)

If you have existing projects, you may want to:
1. Set a default tax year:
   ```sql
   UPDATE Project SET taxYear = 2024 WHERE taxYear IS NULL;
   ```

2. Create a default client for unassigned projects:
   ```sql
   INSERT INTO Client (name, createdAt, updatedAt) 
   VALUES ('Unknown Client', GETDATE(), GETDATE());
   
   UPDATE Project SET clientId = <new_client_id> WHERE clientId IS NULL;
   ```

3. Update any OWNER roles to ADMIN:
   ```sql
   UPDATE ProjectUser SET role = 'ADMIN' WHERE role = 'OWNER';
   ```

## Permission Matrix

| Action | VIEWER | EDITOR | REVIEWER | ADMIN |
|--------|--------|--------|----------|-------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| Edit project data | ❌ | ✅ | ✅ | ✅ |
| Create adjustments | ❌ | ✅ | ✅ | ✅ |
| Approve/reject adjustments | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Archive project | ❌ | ❌ | ❌ | ✅ |

## API Endpoints Available

### Client Management
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/[id]` - Get client details
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client

### User Management
- `GET /api/users/search?q=query` - Search Active Directory users
- `GET /api/projects/[id]/users` - List project team
- `POST /api/projects/[id]/users` - Add user to project
- `PUT /api/projects/[id]/users/[userId]` - Update user role
- `DELETE /api/projects/[id]/users/[userId]` - Remove user

### Enhanced Project APIs
- Project creation and updates now support client, type, and tax details
- All endpoints have proper permission checks based on role

## Files to Review

- `prisma/schema.prisma` - Database schema
- `src/types/index.ts` - TypeScript types
- `src/lib/auth.ts` - Enhanced permission system
- `src/lib/validation.ts` - Validation schemas
- `src/components/ClientSelector.tsx` - UI for client selection
- `src/components/ProjectTypeSelector.tsx` - UI for project type
- `src/components/TaxYearInput.tsx` - UI for tax details
- `src/components/UserManagement/` - User management UI components

## Troubleshooting

**Issue: Cannot see new fields in the application**
- Make sure to restart the Next.js development server
- Clear browser cache
- Check that Prisma Client was regenerated

**Issue: User search not working**
- Verify Azure AD credentials in `.env`
- Check User.Read.All permission is granted
- Test with: `curl http://localhost:3000/api/users/search?q=test`

**Issue: Permission denied errors**
- Check user roles in the database
- Ensure at least one ADMIN per project
- Review the auth.ts permission checks

## Rollback (if needed)

If you need to rollback:

```sql
-- Drop new columns from Project
ALTER TABLE Project DROP COLUMN projectType;
ALTER TABLE Project DROP COLUMN taxYear;
ALTER TABLE Project DROP COLUMN taxPeriodStart;
ALTER TABLE Project DROP COLUMN taxPeriodEnd;
ALTER TABLE Project DROP COLUMN assessmentYear;
ALTER TABLE Project DROP COLUMN submissionDeadline;
ALTER TABLE Project DROP COLUMN clientId;

-- Drop Client table
DROP TABLE Client;

-- Revert roles
UPDATE ProjectUser SET role = 'OWNER' WHERE role = 'ADMIN';
```

## Success! 🎉

Your database is now ready for the enhanced multi-project user management system. All planned features have been successfully implemented and are ready to use.


