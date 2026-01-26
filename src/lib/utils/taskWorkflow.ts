/**
 * Task Workflow Utility Functions
 * 
 * Helper functions for managing client acceptance, engagement acceptance, and engagement letter workflow.
 */

export interface TaskWorkflowStatus {
  isClientTask: boolean;
  clientAcceptanceRequired: boolean;
  clientAcceptanceApproved: boolean;
  acceptanceApproved: boolean; // Engagement acceptance
  engagementLetterComplete: boolean;
  dpaComplete: boolean;
  canAccessWorkTabs: boolean;
  currentStep: 'client_acceptance' | 'acceptance' | 'engagement' | 'dpa' | 'complete';
  nextStep: string;
}

export interface TaskWorkflowData {
  GSClientID?: string | null;  // External GUID - for client relationship
  clientId?: number | null; // Internal client ID
  acceptanceApproved?: boolean; // Engagement acceptance
  acceptanceApprovedBy?: string | null;
  acceptanceApprovedAt?: Date | string | null;
  engagementLetterGenerated?: boolean;
  engagementLetterUploaded?: boolean;
  engagementLetterPath?: string | null;
  engagementLetterUploadedBy?: string | null;
  engagementLetterUploadedAt?: Date | string | null;
  dpaUploaded?: boolean;
  dpaPath?: string | null;
  dpaUploadedBy?: string | null;
  dpaUploadedAt?: Date | string | null;
}

export interface ClientAcceptanceData {
  clientAcceptanceApproved?: boolean;
  clientAcceptanceApprovedAt?: Date | string | null;
}

/**
 * Check if a task is a client task (requires workflow)
 */
export function isClientTask(task: TaskWorkflowData | null | undefined): boolean {
  if (!task) return false;
  return task.GSClientID !== null && task.GSClientID !== undefined;
}

/**
 * Check if work tabs can be accessed
 * (client acceptance approved AND engagement acceptance approved AND engagement letter uploaded AND DPA uploaded)
 */
export function canAccessWorkTabs(
  task: TaskWorkflowData | null | undefined,
  clientAcceptance?: ClientAcceptanceData | null
): boolean {
  if (!task) return false;
  
  // Internal tasks (no client) can always access work tabs
  if (!isClientTask(task)) {
    return true;
  }
  
  // Client tasks need ALL steps complete
  const clientAcceptanceApproved = Boolean(clientAcceptance?.clientAcceptanceApproved);
  return Boolean(
    clientAcceptanceApproved && 
    task.acceptanceApproved && 
    task.engagementLetterUploaded && 
    task.dpaUploaded
  );
}

/**
 * Get the current workflow status (with optional client acceptance data)
 */
export function getWorkflowStatus(
  task: TaskWorkflowData | null | undefined,
  clientAcceptance?: ClientAcceptanceData | null
): TaskWorkflowStatus {
  const isClient = isClientTask(task);
  
  if (!isClient) {
    return {
      isClientTask: false,
      clientAcceptanceRequired: false,
      clientAcceptanceApproved: true,
      acceptanceApproved: true,
      engagementLetterComplete: true,
      dpaComplete: true,
      canAccessWorkTabs: true,
      currentStep: 'complete',
      nextStep: 'No workflow required',
    };
  }
  
  const clientAcceptanceApproved = Boolean(clientAcceptance?.clientAcceptanceApproved);
  const acceptanceApproved = Boolean(task?.acceptanceApproved); // Engagement acceptance
  const engagementLetterComplete = Boolean(task?.engagementLetterUploaded);
  const dpaComplete = Boolean(task?.dpaUploaded);
  
  let currentStep: 'client_acceptance' | 'acceptance' | 'engagement' | 'dpa' | 'complete';
  let nextStep: string;
  
  if (!clientAcceptanceApproved) {
    currentStep = 'client_acceptance';
    nextStep = 'Complete Client Acceptance for this client';
  } else if (!acceptanceApproved) {
    currentStep = 'acceptance';
    nextStep = 'Complete Engagement Acceptance for this task';
  } else if (!engagementLetterComplete) {
    currentStep = 'engagement';
    nextStep = 'Upload signed engagement letter';
  } else if (!dpaComplete) {
    currentStep = 'dpa';
    nextStep = 'Upload Data Processing Agreement (DPA)';
  } else {
    currentStep = 'complete';
    nextStep = 'Workflow complete';
  }
  
  return {
    isClientTask: true,
    clientAcceptanceRequired: true,
    clientAcceptanceApproved,
    acceptanceApproved,
    engagementLetterComplete,
    dpaComplete,
    canAccessWorkTabs: clientAcceptanceApproved && acceptanceApproved && engagementLetterComplete && dpaComplete,
    currentStep,
    nextStep,
  };
}

/**
 * Get message to display for blocked tabs
 */
export function getBlockedTabMessage(
  task: TaskWorkflowData | null | undefined,
  clientAcceptance?: ClientAcceptanceData | null
): string {
  if (!task || !isClientTask(task)) {
    return '';
  }
  
  const status = getWorkflowStatus(task, clientAcceptance);
  
  if (!status.clientAcceptanceApproved) {
    return 'Client Acceptance must be completed before accessing this task';
  }
  
  if (!status.acceptanceApproved) {
    return 'Complete Engagement Acceptance to access this tab';
  }
  
  if (!status.engagementLetterComplete) {
    return 'Upload signed engagement letter to access this tab';
  }
  
  if (!status.dpaComplete) {
    return 'Upload Data Processing Agreement (DPA) to access this tab';
  }
  
  return '';
}

/**
 * Check if engagement letter can be generated/uploaded
 */
export function canManageEngagementLetter(
  task: TaskWorkflowData | null | undefined,
  clientAcceptance?: ClientAcceptanceData | null
): boolean {
  if (!task || !isClientTask(task)) {
    return false;
  }
  
  // Need both client acceptance and engagement acceptance approved
  const clientAcceptanceApproved = Boolean(clientAcceptance?.clientAcceptanceApproved);
  return Boolean(clientAcceptanceApproved && task.acceptanceApproved);
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(
  task: TaskWorkflowData | null | undefined,
  clientAcceptance?: ClientAcceptanceData | null
): number {
  if (!task || !isClientTask(task)) {
    return 100;
  }
  
  let progress = 0;
  const stepValue = 100 / 4; // Four steps: Client Acceptance, Engagement Acceptance, EL, DPA
  
  if (clientAcceptance?.clientAcceptanceApproved) {
    progress += stepValue;
  }
  
  if (task.acceptanceApproved) {
    progress += stepValue;
  }
  
  if (task.engagementLetterUploaded) {
    progress += stepValue;
  }
  
  if (task.dpaUploaded) {
    progress += stepValue;
  }
  
  return Math.round(progress);
}














