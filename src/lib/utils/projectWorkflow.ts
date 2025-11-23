/**
 * Project Workflow Utility Functions
 * 
 * Helper functions for managing client acceptance and engagement letter workflow.
 */

export interface ProjectWorkflowStatus {
  isClientProject: boolean;
  acceptanceApproved: boolean;
  engagementLetterComplete: boolean;
  canAccessWorkTabs: boolean;
  currentStep: 'acceptance' | 'engagement' | 'complete';
  nextStep: string;
}

export interface ProjectWorkflowData {
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
 * Check if a project is a client project (requires workflow)
 */
export function isClientProject(project: ProjectWorkflowData | null | undefined): boolean {
  if (!project) return false;
  return project.clientId !== null && project.clientId !== undefined;
}

/**
 * Check if work tabs can be accessed (acceptance approved AND engagement letter uploaded)
 */
export function canAccessWorkTabs(project: ProjectWorkflowData | null | undefined): boolean {
  if (!project) return false;
  
  // Internal projects (no client) can always access work tabs
  if (!isClientProject(project)) {
    return true;
  }
  
  // Client projects need both acceptance and engagement letter complete
  return Boolean(project.acceptanceApproved && project.engagementLetterUploaded);
}

/**
 * Get the current workflow status
 */
export function getWorkflowStatus(project: ProjectWorkflowData | null | undefined): ProjectWorkflowStatus {
  const isClient = isClientProject(project);
  
  if (!isClient) {
    return {
      isClientProject: false,
      acceptanceApproved: true,
      engagementLetterComplete: true,
      canAccessWorkTabs: true,
      currentStep: 'complete',
      nextStep: 'No workflow required',
    };
  }
  
  const acceptanceApproved = Boolean(project?.acceptanceApproved);
  const engagementLetterComplete = Boolean(project?.engagementLetterUploaded);
  
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
    isClientProject: true,
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
export function getBlockedTabMessage(project: ProjectWorkflowData | null | undefined): string {
  if (!project || !isClientProject(project)) {
    return '';
  }
  
  const status = getWorkflowStatus(project);
  
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
export function canManageEngagementLetter(project: ProjectWorkflowData | null | undefined): boolean {
  if (!project || !isClientProject(project)) {
    return false;
  }
  
  return Boolean(project.acceptanceApproved);
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(project: ProjectWorkflowData | null | undefined): number {
  if (!project || !isClientProject(project)) {
    return 100;
  }
  
  let progress = 0;
  
  if (project.acceptanceApproved) {
    progress += 50;
  }
  
  if (project.engagementLetterUploaded) {
    progress += 50;
  }
  
  return progress;
}



