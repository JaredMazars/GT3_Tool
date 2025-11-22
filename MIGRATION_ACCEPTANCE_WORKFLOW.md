# Client Acceptance Workflow - Migration Guide

## Overview

This document describes the Client Acceptance and Engagement Letter workflow feature and provides instructions for migrating existing projects.

## What Changed

### Database Schema

Added new fields to the `Project` table:
- `acceptanceApproved` - Boolean flag for client acceptance
- `acceptanceApprovedBy` - User ID who approved
- `acceptanceApprovedAt` - Timestamp of approval
- `engagementLetterGenerated` - Boolean flag for letter generation
- `engagementLetterUploaded` - Boolean flag for signed letter upload
- `engagementLetterPath` - File path to signed letter
- `engagementLetterUploadedBy` - User ID who uploaded
- `engagementLetterUploadedAt` - Timestamp of upload

### New Features

1. **Acceptance Tab** - First step for all client projects
   - Display client and project information
   - One-click approval by project admins
   - Tracks who approved and when

2. **Engagement Letter Tab** - Second step after acceptance
   - Generate letter from template with client/project details
   - Download generated letter
   - Upload signed version (PDF or DOCX)
   - Tracks upload metadata

3. **Tab Access Control**
   - Work tabs (mapping, tax calc, opinions, etc.) are disabled until both steps complete
   - Visual indicators (lock icons, tooltips) show requirements
   - Warning banner displays current workflow status

4. **Internal Projects** - No workflow required
   - Projects without a client bypass the workflow
   - All tabs immediately accessible

## Database Migration

### Step 1: Run Prisma Migration

The database migration needs to be run to add the new fields:

```bash
npx prisma migrate deploy
```

Or for development:

```bash
npx prisma migrate dev
```

**Note:** You may need to manually create the migration if it hasn't been applied yet. The schema changes are already in `prisma/schema.prisma`.

### Step 2: Migrate Existing Projects

Use the migration script to approve existing client projects:

```bash
# Dry run to see what would be updated
npx tsx scripts/approve-existing-projects.ts --dry-run

# Auto-approve both acceptance and engagement letter for all existing projects
npx tsx scripts/approve-existing-projects.ts --auto-approve-all

# Only approve acceptance (requires manual engagement letter upload)
npx tsx scripts/approve-existing-projects.ts --acceptance-only
```

**Recommended approach:**
- Use `--auto-approve-all` for existing projects to avoid workflow interruption
- New projects created after this deployment will go through the full workflow

## Workflow for New Projects

When a new client project is created:

1. **Project Creation** - Project is created as usual

2. **Acceptance** (First Tab)
   - Team can view client and project information
   - Project admin must approve client acceptance
   - Other tabs remain disabled

3. **Engagement Letter** (Second Tab)
   - Generate letter from template
   - Download and get signed by client
   - Upload signed version
   - Work tabs become enabled

4. **Team** - Can be managed anytime (not blocked)

5. **Work Tabs** - Only accessible after steps 2-3 complete

## API Endpoints

### POST /api/projects/[id]/acceptance
Approve client acceptance and continuance.
- Requires: Project ADMIN role
- Sets: `acceptanceApproved`, `acceptanceApprovedBy`, `acceptanceApprovedAt`

### POST /api/projects/[id]/engagement-letter/generate
Generate engagement letter from template.
- Requires: Project ADMIN or EDITOR role
- Requires: Acceptance approved
- Returns: Generated letter content (Markdown)

### POST /api/projects/[id]/engagement-letter
Upload signed engagement letter.
- Requires: Project ADMIN or EDITOR role
- Requires: Acceptance approved
- Accepts: PDF or DOCX files
- Sets: `engagementLetterUploaded`, `engagementLetterPath`, metadata

### GET /api/projects/[id]/engagement-letter
Get engagement letter status.
- Returns: Current status of generation and upload

## File Uploads

Signed engagement letters are saved to:
```
uploads/engagement-letters/[projectId]/engagement-letter-[timestamp].[ext]
```

Ensure the `uploads` directory has proper write permissions.

## Utility Functions

Located in `src/lib/utils/projectWorkflow.ts`:

- `isClientProject(project)` - Check if project requires workflow
- `canAccessWorkTabs(project)` - Check if work tabs are accessible
- `getWorkflowStatus(project)` - Get current workflow state
- `getBlockedTabMessage(project)` - Get message for blocked tabs
- `canManageEngagementLetter(project)` - Check if engagement letter can be managed
- `getWorkflowProgress(project)` - Get percentage completion

## Testing Checklist

After deployment, verify:

- [ ] Existing client projects are migrated and accessible
- [ ] New client projects show Acceptance tab first
- [ ] Work tabs are disabled until workflow complete
- [ ] Internal projects (no client) bypass workflow
- [ ] Acceptance approval works (admin only)
- [ ] Engagement letter generation works
- [ ] Engagement letter upload works (PDF/DOCX)
- [ ] Work tabs become enabled after upload
- [ ] Team tab always accessible
- [ ] Tooltips display on disabled tabs
- [ ] Warning banner shows workflow status

## Rollback Plan

If issues occur:

1. Existing projects already migrated will continue working
2. Can manually update projects via database:
   ```sql
   UPDATE Project 
   SET acceptanceApproved = 1, 
       engagementLetterUploaded = 1,
       engagementLetterPath = 'legacy'
   WHERE clientId IS NOT NULL;
   ```

3. To disable workflow checks temporarily, modify `canAccessWorkTabs` in `projectWorkflow.ts` to always return `true`

## Support

For issues or questions:
1. Check this migration guide
2. Review workflow utility functions
3. Check API route error responses
4. Verify database migration status


