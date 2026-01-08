# Client Partner/Manager Change Request System

## Overview
This migration adds a new table to support change requests for Client Partner and Client Manager assignments. Users with MANAGER+ roles can request changes, which must be approved by the proposed person.

## Changes

### New Table: `ClientPartnerManagerChangeRequest`
Tracks change requests for client partner and manager assignments with full audit trail.

**Fields:**
- `id`: Auto-increment primary key
- `clientId`: Reference to Client table
- `changeType`: Either 'PARTNER' or 'MANAGER'
- `currentEmployeeCode`: Current partner/manager employee code
- `currentEmployeeName`: Current partner/manager name (denormalized for history)
- `proposedEmployeeCode`: Proposed new partner/manager employee code
- `proposedEmployeeName`: Proposed new partner/manager name (denormalized)
- `reason`: Optional reason for the change request
- `status`: Request status ('PENDING', 'APPROVED', 'REJECTED')
- `requestedById`: User who requested the change
- `requestedAt`: When the request was created
- `resolvedById`: User who approved/rejected the request
- `resolvedAt`: When the request was resolved
- `resolutionComment`: Optional comment when approving/rejecting

**Indexes:**
- `clientId` - For fetching client's change history
- `status` - For filtering pending/resolved requests
- `proposedEmployeeCode, status` - For finding pending requests for a specific employee
- `requestedAt DESC` - For chronological ordering

## Workflow

1. User with MANAGER+ role clicks on client partner/manager badge
2. Modal opens to select new partner/manager and provide reason
3. Request created with PENDING status
4. Notifications sent to:
   - Proposed partner/manager (action required)
   - Current partner/manager (informational)
   - Requester (confirmation)
5. Proposed person approves/rejects via notification
6. If approved: Client record updated automatically
7. Final notifications sent to requester and previous partner/manager

## Related Files
- Schema: `prisma/schema.prisma` - ClientPartnerManagerChangeRequest model
- API: `src/app/api/clients/[id]/change-requests/route.ts`
- API: `src/app/api/change-requests/[requestId]/approve/route.ts`
- API: `src/app/api/change-requests/[requestId]/reject/route.ts`
- Component: `src/components/features/clients/ChangePartnerManagerModal.tsx`
