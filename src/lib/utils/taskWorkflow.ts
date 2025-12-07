/**
 * Task Workflow Utility Functions
 * 
 * Helper functions for managing client acceptance and engagement letter workflow.
 */

export interface TaskWorkflowStatus {
  isClientTask: boolean;
  acceptanceApproved: boolean;
  engagementLetterComplete: boolean;
  canAccessWorkTabs: boolean;
  currentStep: 'acceptance' | 'engagement' | 'complete';
  nextStep: string;
}

export interface TaskWorkflowData {
  clientId?: number | null;
  acceptanceApproved?: boolean;
  acceptanceApprovedBy?: string | null;
  acceptanceApprovedAt?: Date | string | null;
  engagementLetterGenerated?: boolean;
  engagementLetterUploaded?: boolean;
  engagementLetterPath?: string | null;
  engagementLetterUploadedBy?: string | null;
  engagementLetterUploadedAt?: Date | string | null;
}

/**
 * Check if a task is a client task (requires workflow)
 */
export function isClientTask(task: TaskWorkflowData | null | undefined): boolean {
  if (!task) return false;
  return task.clientId !== null && task.clientId !== undefined;
}

/**
 * Check if work tabs can be accessed (acceptance approved AND engagement letter uploaded)
 */
export function canAccessWorkTabs(task: TaskWorkflowData | null | undefined): boolean {
  if (!task) return false;
  
  // Internal tasks (no client) can always access work tabs
  if (!isClientTask(task)) {
    return true;
  }
  
  // Client tasks need both acceptance and engagement letter complete
  return Boolean(task.acceptanceApproved && task.engagementLetterUploaded);
}

/**
 * Get the current workflow status
 */
export function getWorkflowStatus(task: TaskWorkflowData | null | undefined): TaskWorkflowStatus {
  const isClient = isClientTask(task);
  
  if (!isClient) {
    return {
      isClientTask: false,
      acceptanceApproved: true,
      engagementLetterComplete: true,
      canAccessWorkTabs: true,
      currentStep: 'complete',
      nextStep: 'No workflow required',
    };
  }
  
  const acceptanceApproved = Boolean(task?.acceptanceApproved);
  const engagementLetterComplete = Boolean(task?.engagementLetterUploaded);
  
  let currentStep: 'acceptance' | 'engagement' | 'complete';
  let nextStep: string;
  
  if (!acceptanceApproved) {
    currentStep = 'acceptance';
    nextStep = 'Complete client acceptance and continuance';
  } else if (!engagementLetterComplete) {
    currentStep = 'engagement';
    nextStep = 'Generate and upload signed engagement letter';
  } else {
    currentStep = 'complete';
    nextStep = 'Workflow complete';
  }
  
  return {
    isClientTask: true,
    acceptanceApproved,
    engagementLetterComplete,
    canAccessWorkTabs: acceptanceApproved && engagementLetterComplete,
    currentStep,
    nextStep,
  };
}

/**
 * Get message to display for blocked tabs
 */
export function getBlockedTabMessage(task: TaskWorkflowData | null | undefined): string {
  if (!task || !isClientTask(task)) {
    return '';
  }
  
  const status = getWorkflowStatus(task);
  
  if (!status.acceptanceApproved) {
    return 'Complete client acceptance and continuance to access this tab';
  }
  
  if (!status.engagementLetterComplete) {
    return 'Upload signed engagement letter to access this tab';
  }
  
  return '';
}

/**
 * Check if engagement letter can be generated/uploaded
 */
export function canManageEngagementLetter(task: TaskWorkflowData | null | undefined): boolean {
  if (!task || !isClientTask(task)) {
    return false;
  }
  
  return Boolean(task.acceptanceApproved);
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(task: TaskWorkflowData | null | undefined): number {
  if (!task || !isClientTask(task)) {
    return 100;
  }
  
  let progress = 0;
  
  if (task.acceptanceApproved) {
    progress += 50;
  }
  
  if (task.engagementLetterUploaded) {
    progress += 50;
  }
  
  return progress;
}











