# Add Vault Document Approval Route Migration

## Purpose

Adds the missing approval route configuration for the `VAULT_DOCUMENT` workflow type.

## Changes

### ApprovalRoute Table

Inserts a new approval route:
- **Workflow Type**: `VAULT_DOCUMENT`
- **Route Name**: `admin-approval`
- **Description**: Requires administrator approval for document vault uploads
- **Route Config**: Single step requiring ADMINISTRATOR role
- **Is Active**: `true`
- **Is Default**: `true`

## Route Configuration

```json
{
  "steps": [
    {
      "stepOrder": 1,
      "stepType": "ROLE",
      "assignedToRole": "ADMINISTRATOR",
      "isRequired": true
    }
  ],
  "requiresAllSteps": true
}
```

## Workflow

When a document is uploaded to the vault:
1. Document status is set to `PENDING_APPROVAL`
2. An approval is created with workflow type `VAULT_DOCUMENT`
3. The approval is routed to users with ADMINISTRATOR role
4. Administrator reviews and approves/rejects the document
5. Upon approval, document status changes to `PUBLISHED`

## Rollback

To rollback this migration:

```sql
DELETE FROM ApprovalRoute 
WHERE workflowType = 'VAULT_DOCUMENT' 
AND routeName = 'admin-approval';
```

## Applied

Run this migration using:
```bash
npx prisma migrate deploy
```
