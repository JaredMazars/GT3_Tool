# Add Dual Approval to Change Requests

## Overview
This migration adds support for dual approval workflow where both the current and proposed partner/manager must approve a change request when the current employee is active.

## Changes

### New Fields Added to `ClientPartnerManagerChangeRequest`

1. **requiresDualApproval** (BIT, NOT NULL, DEFAULT 0)
   - Indicates whether this request requires approval from both current and proposed employees
   - Set to `true` when current employee is active (Active = 'Yes')
   - Set to `false` when current employee is not active (only proposed approval needed)

2. **currentEmployeeApprovedAt** (DATETIME2, nullable)
   - Timestamp when the current employee approved the request
   - NULL if not yet approved

3. **currentEmployeeApprovedById** (NVARCHAR(1000), nullable)
   - User ID of the person who approved as the current employee
   - NULL if not yet approved
   - Foreign key to User table

4. **proposedEmployeeApprovedAt** (DATETIME2, nullable)
   - Timestamp when the proposed employee approved the request
   - NULL if not yet approved

5. **proposedEmployeeApprovedById** (NVARCHAR(1000), nullable)
   - User ID of the person who approved as the proposed employee
   - NULL if not yet approved
   - Foreign key to User table

### Status Flow

The status field now supports three values for approval workflow:
- **PENDING**: No approvals received yet
- **PARTIALLY_APPROVED**: First approval received (when requiresDualApproval = true)
- **APPROVED**: All required approvals received, change applied
- **REJECTED**: Request rejected by either party

### Workflow Logic

1. **Single Approval** (requiresDualApproval = false):
   - Current employee is NOT active
   - Only proposed employee needs to approve
   - Status: PENDING → APPROVED (on approval)

2. **Dual Approval** (requiresDualApproval = true):
   - Current employee IS active
   - Both current and proposed employees must approve
   - Either can approve first
   - Status: PENDING → PARTIALLY_APPROVED → APPROVED

3. **Rejection**:
   - Either party can reject at any time
   - Rejection is immediate (no need for second person to act)
   - Status: PENDING or PARTIALLY_APPROVED → REJECTED

### Backward Compatibility

- All existing records are updated with `requiresDualApproval = 0`
- Existing approval flow continues to work for old records
- New records will use the dual approval logic based on current employee active status

### Indexes

Added indexes on:
- `requiresDualApproval` - For filtering requests by approval type
- `currentEmployeeApprovedById` - For finding requests approved by specific users
- `proposedEmployeeApprovedById` - For finding requests approved by specific users

## Related Files

- Schema: `prisma/schema.prisma` - Updated ClientPartnerManagerChangeRequest model
- Service: `src/lib/services/clients/changeRequestService.ts` - Dual approval logic
- UI: `src/components/features/clients/ApproveChangeRequestModal.tsx` - Approval status display
