/**
 * Approval Types and DTOs
 * Types for the My Approvals feature aggregating all pending approvals
 */

import type { ApprovalWithSteps } from '@/types/approval';

/**
 * Change Request Approval
 * Client Partner/Manager change requests requiring user approval
 */
export interface ChangeRequestApproval {
  id: number;
  clientId: number;
  changeType: 'PARTNER' | 'MANAGER';
  currentEmployeeCode: string;
  currentEmployeeName: string | null;
  proposedEmployeeCode: string;
  proposedEmployeeName: string | null;
  reason: string | null;
  status: string;
  requestedAt: Date;
  requestedById: string;
  requestedByName: string | null;
  resolvedAt: Date | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolutionComment: string | null;
  requiresDualApproval: boolean;
  currentEmployeeApprovedAt: Date | null;
  currentEmployeeApprovedById: string | null;
  currentEmployeeApprovedByName: string | null;
  proposedEmployeeApprovedAt: Date | null;
  proposedEmployeeApprovedById: string | null;
  proposedEmployeeApprovedByName: string | null;
  client: {
    GSClientID: string;
    clientCode: string;
    clientNameFull: string | null;
    groupCode: string;
  };
}

/**
 * Client Acceptance Approval
 * Clients with completed risk assessments needing partner approval
 */
export interface ClientAcceptanceApproval {
  clientId: number;
  clientGSID: string;
  clientCode: string;
  clientName: string | null;
  acceptanceId: number;
  completedAt: Date;
  completedBy: string | null;
  riskRating: string | null;
  overallRiskScore: number | null;
}

/**
 * Engagement Acceptance Approval
 * Tasks with completed engagement acceptance questionnaires needing partner approval
 * (formerly called ClientAcceptanceApproval - renamed for clarity)
 */
export interface EngagementAcceptanceApproval {
  taskId: number;
  taskName: string;
  taskCode: string | null;
  clientId: number;
  clientGSID: string;
  clientCode: string;
  clientName: string | null;
  servLineCode: string;
  subServlineGroupCode: string | null;
  masterCode: string | null;
  acceptanceResponseId: number;
  completedAt: Date;
  completedBy: string | null;
  riskRating: string | null;
  overallRiskScore: number | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}

/**
 * Engagement Letter Approval
 * Tasks with uploaded engagement letters needing partner approval
 */
export interface EngagementLetterApproval {
  taskId: number;
  taskName: string;
  taskCode: string | null;
  clientId: number;
  clientGSID: string;
  clientCode: string;
  clientName: string | null;
  servLineCode: string;
  subServlineGroupCode: string | null;
  masterCode: string | null;
  engagementLetterPath: string;
  engagementLetterUploadedAt: Date;
  engagementLetterUploadedBy: string | null;
}

/**
 * DPA Approval
 * Tasks with uploaded DPAs needing partner approval
 */
export interface DpaApproval {
  taskId: number;
  taskName: string;
  taskCode: string | null;
  clientId: number;
  clientGSID: string;
  clientCode: string;
  clientName: string | null;
  servLineCode: string;
  subServlineGroupCode: string | null;
  masterCode: string | null;
  dpaPath: string;
  dpaUploadedAt: Date;
  dpaUploadedBy: string | null;
}

/**
 * Review Note Approval
 * Review notes requiring action from user (assignee/raiser)
 */
export interface ReviewNoteApproval {
  id: number;
  taskId: number;
  taskName: string;
  taskCode: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  raisedBy: string;
  raisedByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  currentOwner: string | null;
  createdAt: Date;
  updatedAt: Date;
  clearedAt: Date | null;
  clearedBy: string | null;
  clearedByName: string | null;
  clearanceComment: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  actionRequired: 'ASSIGNEE' | 'RAISER';
  clientId: number;
  clientGSID: string;
  servLineCode: string;
  subServlineGroupCode: string | null;
  masterCode: string | null;
}

/**
 * Independence Confirmation Approval
 * Pending independence confirmations for client tasks
 */
export interface IndependenceConfirmationApproval {
  id: number;
  taskTeamId: number;
  taskId: number;
  taskName: string;
  taskCode: string | null;
  clientId: number;
  clientGSID: string;
  clientCode: string;
  clientName: string | null;
  role: string;
  servLineCode: string;
  subServlineGroupCode: string | null;
  masterCode: string | null;
  addedAt: Date;
}

/**
 * Aggregated Approvals Response
 * All pending approvals for the current user
 */
export interface ApprovalsResponse {
  changeRequests: ChangeRequestApproval[];
  clientAcceptances: ClientAcceptanceApproval[];
  engagementAcceptances: EngagementAcceptanceApproval[];
  reviewNotes: ReviewNoteApproval[];
  independenceConfirmations: IndependenceConfirmationApproval[];
  centralizedApprovals: ApprovalWithSteps[];
  totalCount: number;
}

/**
 * Vault Document Timeline Data
 * Data structure for displaying vault document approval timeline
 */
export interface VaultDocumentTimelineData {
  requestedByName: string;
  requestedAt: Date;
  ApprovalStep: Array<{
    stepOrder: number;
    status: string;
    approvedAt: Date | null;
    User_ApprovalStep_assignedToUserIdToUser: {
      name: string | null;
    } | null;
  }>;
}

/**
 * Approvals Count Response
 * Just the total count for badge display
 */
export interface ApprovalsCountResponse {
  count: number;
}
