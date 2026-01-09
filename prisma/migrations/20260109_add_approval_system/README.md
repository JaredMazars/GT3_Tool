# Generic Approval System Migration

## Overview
This migration adds a centralized, reusable approval system that can handle all approval workflows (change requests, acceptance, continuance, etc.) with support for multi-approver, delegation, and conditional routing.

## Tables Added

### 1. Approval
Core approval tracking table. Each approval represents a workflow instance requiring one or more approvals.

**Key Fields:**
- `workflowType`: Type of workflow (e.g., 'CHANGE_REQUEST', 'ACCEPTANCE', 'CONTINUANCE')
- `workflowId`: ID of the record in the workflow-specific table
- `status`: Current status ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
- `priority`: Priority level ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
- `currentStepId`: Points to the current approval step
- `requiresAllSteps`: Whether all steps must be approved (sequential) or just one (parallel)

### 2. ApprovalStep
Individual approval steps within an approval. Supports multi-approver workflows.

**Key Fields:**
- `stepOrder`: Order of the step (for sequential approvals)
- `stepType`: Type of assignment ('USER', 'ROLE', 'CONDITIONAL')
- `assignedToUserId`: Direct user assignment
- `assignedToRole`: Role-based assignment (dynamically resolved)
- `assignedToCondition`: JSON condition for dynamic routing
- `status`: Step status ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')
- `isDelegated`: Whether this step has been delegated
- `delegatedToUserId`: User who received the delegation

### 3. ApprovalRoute
Pre-configured approval routes for different workflows. Defines the approval flow pattern.

**Key Fields:**
- `workflowType`: Workflow this route applies to
- `routeName`: Unique name for the route (e.g., 'dual-approval', 'partner-only')
- `routeConfig`: JSON configuration defining steps, conditions, and rules
- `isDefault`: Whether this is the default route for the workflow type

**Example Route Config:**
```json
{
  "steps": [
    {
      "stepOrder": 1,
      "stepType": "USER",
      "assignedToUserIdPath": "context.proposedEmployeeCode",
      "isRequired": true
    },
    {
      "stepOrder": 2,
      "stepType": "USER",
      "assignedToUserIdPath": "context.currentEmployeeCode",
      "isRequired": true,
      "condition": "context.requiresDualApproval === true"
    }
  ],
  "requiresAllSteps": true
}
```

### 4. ApprovalDelegation
Approval delegation support for out-of-office scenarios.

**Key Fields:**
- `fromUserId`: User delegating their approvals
- `toUserId`: User receiving delegated approvals
- `workflowType`: Optional - limit delegation to specific workflow types
- `startDate` / `endDate`: Delegation period
- `isActive`: Whether delegation is currently active

## Integration Pattern

### Workflow Tables
Workflow-specific tables (like `ClientPartnerManagerChangeRequest`) should add an `approvalId` field:

```sql
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD [approvalId] INT NULL,
CONSTRAINT [FK_ChangeRequest_Approval] FOREIGN KEY ([approvalId]) 
    REFERENCES [dbo].[Approval]([id]) ON DELETE NO ACTION;
```

### Creating Approvals
When a workflow requires approval:

```typescript
const approval = await approvalService.createApproval({
  workflowType: 'CHANGE_REQUEST',
  workflowId: changeRequest.id,
  title: `Partner Change for ${clientName}`,
  requestedById: user.id,
  routeName: 'dual-approval',
  context: {
    proposedEmployeeCode: changeRequest.proposedEmployeeCode,
    currentEmployeeCode: changeRequest.currentEmployeeCode,
    requiresDualApproval: true
  }
});

// Link back to workflow
await prisma.clientPartnerManagerChangeRequest.update({
  where: { id: changeRequest.id },
  data: { approvalId: approval.id }
});
```

## Benefits

1. **Centralized Logic**: All approval logic in one place
2. **Reusable**: Add new workflows by registering in workflow registry
3. **Flexible Routing**: Support any approval pattern via configurable routes
4. **Audit Trail**: Complete history of all approvals
5. **Delegation**: Built-in support for out-of-office scenarios
6. **Extensible**: Easy to add features (reminders, escalation, etc.)

## Migration Notes

- This is a non-breaking change - existing approval mechanisms continue to work
- Gradual migration: Workflows can be moved to the new system one at a time
- Old approval fields in workflow tables can be deprecated after migration

## Next Steps

1. Seed approval routes for common workflows
2. Build `ApprovalService` with core methods
3. Create workflow registry for different approval types
4. Migrate existing change request workflow
5. Update UI to use unified approval components
