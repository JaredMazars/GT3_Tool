# Redundancy Cleanup - Verification Checklist

Use this checklist to verify that all changes from the redundancy cleanup are working correctly.

## Pre-Deployment Verification

### 1. TypeScript Build
- [ ] Run `npm run build` successfully
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Build time is reasonable

### 2. Critical Path Testing

#### Project Type Formatting
- [ ] Service line page displays project type badges correctly
- [ ] Project detail pages show correct project type
- [ ] Client project lists format types properly
- [ ] Project creation dropdown shows all types

**Test Pages:**
- `/dashboard/[serviceLine]/page` - Project list with type badges
- `/dashboard/[serviceLine]/clients/[id]/page` - Client projects with types
- `/dashboard/[serviceLine]/internal/projects/[projectId]/page` - Project detail

#### Role Formatting
- [ ] Admin user management shows roles correctly
- [ ] Email notifications format roles properly (check Email table or logs)
- [ ] In-app notifications format roles correctly
- [ ] Service line access displays show correct role labels

**Test Pages:**
- `/dashboard/admin/users/page` - User management with role badges
- Check sent emails in database/logs
- `/dashboard/notifications` - In-app notifications

#### Currency/Amount Formatting
- [ ] Trial Balance Report shows amounts correctly
- [ ] BD Opportunity cards format values correctly
- [ ] BD Opportunity detail page shows amounts correctly
- [ ] Tax Calculation reports format correctly

**Test Pages:**
- `/dashboard/projects/[id]/reporting/page` - Trial Balance Report
- `/dashboard/[serviceLine]/bd/page` - BD Pipeline with opportunity cards
- `/dashboard/[serviceLine]/bd/[id]/page` - BD Opportunity detail

#### API Routes (ID Parsing)
- [ ] Project API routes work: `/api/projects/[id]`
- [ ] Tax adjustment routes work: `/api/projects/[id]/tax-adjustments/[adjustmentId]`
- [ ] Document routes work (if any use parseDocumentId)

**Test Requests:**
```bash
# Test project endpoint
curl http://localhost:3000/api/projects/1

# Test tax adjustment endpoint
curl http://localhost:3000/api/projects/1/tax-adjustments/1

# Should handle invalid IDs gracefully
curl http://localhost:3000/api/projects/invalid
```

### 3. Import Verification

Run these searches to ensure no broken imports:

```bash
# Check for any remaining imports from deprecated locations
grep -r "from.*projectUtils.*formatProjectType" src/
grep -r "from.*projectUtils.*getProjectTypeColor" src/
grep -r "from.*projectUtils.*getRoleBadgeColor" src/
grep -r "from.*authorization.*formatServiceLineRole" src/
grep -r "from.*authorization.*getUserServiceLines" src/
grep -r "from.*responseHelpers.*okResponse" src/

# Should return NO results (all should be updated)
```

### 4. Email Template Verification

**Test Email Sending:**
- [ ] Add a user to a project - check email content formats correctly
- [ ] Remove a user from a project - check email content formats correctly

**Files to Check:**
- `src/lib/services/email/templates/userAddedTemplate.ts`
- `src/lib/services/email/templates/userRemovedTemplate.ts`

### 5. Error Handling Verification

**Test Invalid IDs:**
```bash
# Should return proper 400 error with "Project ID is required"
curl http://localhost:3000/api/projects/undefined

# Should return proper 400 error with "Invalid project ID format"
curl http://localhost:3000/api/projects/abc

# Should return proper 400 error
curl http://localhost:3000/api/projects/-1
```

Expected error format:
```json
{
  "success": false,
  "error": "Invalid project ID format - must be a positive integer",
  "code": "VALIDATION_ERROR"
}
```

## Post-Deployment Monitoring

### Day 1-3
- [ ] Monitor error logs for any unexpected errors
- [ ] Check that notifications are sending correctly
- [ ] Verify email templates are rendering properly
- [ ] Test all major workflows (create project, add user, etc.)

### Week 1-2
- [ ] Review user feedback for any display issues
- [ ] Check analytics for any error rate increases
- [ ] Verify all reports generating correctly

### Week 2-4
- [ ] No issues reported
- [ ] All deprecated functions can be considered safe to remove
- [ ] Proceed with Phase 3 (final removal)

## Common Issues & Solutions

### Issue: "Cannot find module '@/lib/utils/serviceLineUtils'"
**Solution:** Check that the import path is correct and the file exists

### Issue: "formatProjectType is not a function"
**Solution:** Verify the import statement includes formatProjectType in the import list

### Issue: Role badge colors wrong
**Solution:** Check that getRoleBadgeColor is imported from permissionUtils, not projectUtils

### Issue: Currency formatting different
**Solution:** formatAmount uses 'en-ZA' locale and 'ZAR' currency - this is correct

### Issue: Email template broken
**Solution:** Ensure formatProjectType and formatRole are imported at the top of the template file

## Files to Watch

These files were modified and should be monitored:

**High Priority:**
1. `src/lib/utils/apiUtils.ts` - ID parsing refactored
2. `src/lib/utils/projectUtils.ts` - Multiple deprecations
3. `src/lib/services/auth/authorization.ts` - Multiple deprecations

**Medium Priority:**
4. `src/app/dashboard/[serviceLine]/internal/projects/[projectId]/page.tsx`
5. `src/app/dashboard/[serviceLine]/clients/[id]/projects/[projectId]/page.tsx`
6. `src/app/dashboard/[serviceLine]/clients/[id]/page.tsx`
7. `src/app/dashboard/admin/users/page.tsx`
8. `src/components/features/reports/TrialBalanceReport.tsx`
9. `src/components/features/bd/OpportunityCard.tsx`

**Low Priority:**
10. `src/lib/services/email/templates/*` - Email templates
11. `src/lib/services/notifications/templates.ts` - Notification templates

## Automated Tests

If you have automated tests, run these test suites:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "project type"
npm test -- --grep "role formatting"
npm test -- --grep "currency"
npm test -- --grep "API routes"
```

## Rollback Procedure

If critical issues are found:

```bash
# Revert all changes
git log --oneline -20  # Find commit hash before cleanup
git revert <commit-hash>

# Or cherry-pick specific file reverts
git checkout <commit-hash> -- src/lib/utils/projectUtils.ts
```

## Sign-off

- [ ] All verification tests passed
- [ ] No linter errors
- [ ] Build succeeds
- [ ] Critical paths tested manually
- [ ] Error handling verified
- [ ] Ready for deployment

**Verified By:** _____________  
**Date:** _____________  
**Notes:** _____________














