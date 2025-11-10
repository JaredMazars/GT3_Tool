# Database Migration Instructions

## Enhanced Multi-Project User Management

This migration adds support for:
- Multiple project types (Tax Calculation, Tax Opinion, Tax Administration)
- Client/Organization management with comprehensive profiles
- 4-level role hierarchy (Admin, Reviewer, Editor, Viewer)
- Tax year and period tracking
- Active Directory integration for user management

### Prerequisites

1. Ensure you have a backup of your database
2. Ensure you have database access credentials
3. The application should be stopped during migration

### Running the Migration

#### Option 1: Using Prisma Migrate (Recommended)

When the database is available, run:

```bash
npx prisma migrate dev --name enhanced_multi_project_user_management
```

This will:
- Create the migration from the schema changes
- Apply it to the database
- Regenerate the Prisma Client

#### Option 2: Manual SQL Execution

If you prefer to run the migration manually or the database is remote:

1. Connect to your SQL Server database
2. Execute the migration file:
   ```
   prisma/migrations/enhanced_multi_project_user_management.sql
   ```
3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

### What the Migration Does

1. **Creates Client Table**
   - Stores client/organization information
   - Includes company details, tax information, and contact details

2. **Enhances Project Table**
   - Adds `projectType` (defaults to TAX_CALCULATION)
   - Adds `taxYear`, `taxPeriodStart`, `taxPeriodEnd`
   - Adds `assessmentYear`, `submissionDeadline`
   - Adds `clientId` foreign key to Client table
   - Creates appropriate indexes

3. **Updates ProjectUser Roles**
   - Changes existing OWNER roles to ADMIN
   - Maintains existing EDITOR and VIEWER roles
   - Adds support for new REVIEWER role

4. **Data Migration**
   - Creates a default "Unknown Client" for existing projects
   - Sets default tax year to current year for existing projects
   - Preserves all existing project data

### Post-Migration Steps

1. **Verify the Migration**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

2. **Test the Application**
   - Start the application
   - Verify existing projects still work
   - Test creating a new project with client and tax details
   - Test user management features

3. **Update Environment Variables**
   
   Ensure these are set in your `.env` file:
   ```
   # Existing variables
   DATABASE_URL="..."
   AZURE_AD_CLIENT_ID="..."
   AZURE_AD_CLIENT_SECRET="..."
   AZURE_AD_TENANT_ID="..."
   
   # The same Azure AD credentials will be used for Microsoft Graph API
   ```

### New Features Available After Migration

1. **Client Management**
   - Create and manage clients
   - Assign projects to clients
   - Track client tax information

2. **Project Types**
   - Tax Calculation (existing functionality)
   - Tax Opinion
   - Tax Administration

3. **Enhanced Permissions**
   - ADMIN: Full project control, user management
   - REVIEWER: Can approve/reject tax adjustments
   - EDITOR: Can edit data
   - VIEWER: Read-only access

4. **Tax Year Tracking**
   - Tax year
   - Tax period dates
   - Assessment year
   - Submission deadlines

5. **User Management**
   - Search Active Directory users
   - Add users to projects with specific roles
   - Change user roles
   - Remove users from projects

### API Endpoints Added

- `GET/POST /api/clients` - List and create clients
- `GET/PUT/DELETE /api/clients/[id]` - Manage individual clients
- `GET /api/users/search` - Search AD users
- `GET/POST /api/projects/[id]/users` - Manage project users
- `GET/PUT/DELETE /api/projects/[id]/users/[userId]` - Manage individual user access

### Rollback

If you need to rollback this migration:

1. **Using Prisma**
   ```bash
   npx prisma migrate resolve --rolled-back enhanced_multi_project_user_management
   ```

2. **Manual Rollback**
   - Drop the Client table
   - Remove the new columns from Project table
   - Change ADMIN roles back to OWNER in ProjectUser table
   - Remove the indexes created

### Troubleshooting

**Issue: Migration fails due to existing data**
- Ensure the "Unknown Client" is created first
- Check that all existing ProjectUser records have valid role values

**Issue: Foreign key constraint error**
- Verify the Client table was created successfully
- Ensure clientId values reference existing clients

**Issue: Active Directory search not working**
- Verify AZURE_AD credentials are correct
- Ensure the application has User.Read.All permissions in Azure AD
- Check that the Microsoft Graph API is accessible

### Support

For issues or questions, please refer to the main documentation or contact the development team.


