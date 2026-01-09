/**
 * Generic Approval System Types
 * Centralized types for the reusable approval framework
 */

import type { Approval, ApprovalStep, ApprovalRoute, ApprovalDelegation } from '@prisma/client';

/**
 * Approval status
 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * Approval step status
 */
export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

/**
 * Approval priority
 */
export type ApprovalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Step type
 */
export type ApprovalStepType = 'USER' | 'ROLE' | 'CONDITIONAL';

/**
 * Workflow types
 */
export type WorkflowType = 
  | 'CHANGE_REQUEST' 
  | 'ACCEPTANCE' 
  | 'CONTINUANCE'
  | 'ENGAGEMENT_LETTER'
  | 'DPA'
  | 'REVIEW_NOTE';

/**
 * Approval with related data
 */
export interface ApprovalWithSteps extends Approval {
  ApprovalStep: ApprovalStep[];
  RequestedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  CompletedBy?: {
    id: string;
    name: string | null;
  } | null;
}

/**
 * Approval step with user data
 */
export interface ApprovalStepWithUsers extends ApprovalStep {
  AssignedToUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  ApprovedBy?: {
    id: string;
    name: string | null;
  } | null;
  DelegatedToUser?: {
    id: string;
    name: string | null;
  } | null;
}

/**
 * Route configuration structure
 */
export interface RouteConfig {
  steps: RouteStepConfig[];
  requiresAllSteps: boolean;
}

export interface RouteStepConfig {
  stepOrder: number;
  stepType: ApprovalStepType;
  isRequired?: boolean;
  // For USER type
  assignedToUserIdPath?: string;  // JSON path to user ID in context
  // For ROLE type
  assignedToRole?: string;
  // Conditional logic
  condition?: string;  // JavaScript expression to evaluate
}

/**
 * Configuration for creating an approval
 */
export interface CreateApprovalConfig {
  workflowType: WorkflowType;
  workflowId: number;
  title: string;
  description?: string;
  priority?: ApprovalPriority;
  requestedById: string;
  routeName?: string;  // If not provided, uses default route
  context?: Record<string, unknown>;  // Context data for route evaluation
}

/**
 * Configuration for creating a route
 */
export interface CreateRouteConfig {
  workflowType: WorkflowType;
  routeName: string;
  description?: string;
  routeConfig: RouteConfig;
  isDefault?: boolean;
}

/**
 * Configuration for delegation
 */
export interface DelegationConfig {
  toUserId: string;
  workflowType?: WorkflowType;  // If not provided, delegates all
  startDate: Date;
  endDate?: Date;
  reason?: string;
}

/**
 * Approval action result
 */
export interface ApprovalActionResult {
  success: boolean;
  approval: Approval;
  nextStep?: ApprovalStep | null;
  isComplete: boolean;
}

/**
 * User approvals response
 */
export interface UserApprovalsResponse {
  approvals: ApprovalWithSteps[];
  groupedByWorkflow: Record<WorkflowType, ApprovalWithSteps[]>;
  totalCount: number;
}

/**
 * Workflow data fetcher
 */
export type WorkflowDataFetcher = (workflowId: number) => Promise<unknown>;

/**
 * Workflow registry entry
 */
export interface WorkflowRegistryEntry {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultRoute: string;
  fetchData: WorkflowDataFetcher;
  getDisplayTitle?: (data: unknown) => string;
  getDisplayDescription?: (data: unknown) => string;
}

/**
 * Active delegation
 */
export interface ActiveDelegation extends ApprovalDelegation {
  FromUser: {
    id: string;
    name: string | null;
    email: string;
  };
  ToUser: {
    id: string;
    name: string | null;
    email: string;
  };
}
