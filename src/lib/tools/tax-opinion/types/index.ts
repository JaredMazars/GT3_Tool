export interface AITaxReport {
  id: number;
  executiveSummary: string;
  risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  taxSensitiveItems: Array<{
    item: string;
    reason: string;
    action: string;
  }>;
  detailedFindings: string;
  recommendations: string[];
  generatedAt: string;
}

export interface OpinionDraft {
  id: number;
  taskId: number;
  title: string;
  status: string;
  workflowPhase: string;
  content?: string | null;
  metadata?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpinionChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface WorkflowState {
  phase: string;
  completeness: number;
  factsEstablished: boolean;
  researchComplete: boolean;
  analysisComplete: boolean;
  draftComplete: boolean;
  reviewComplete: boolean;
  readyForExport: boolean;
}

export interface ChatResponse {
  message: string;
  phase: string;
  suggestions: string[];
  workflowState: WorkflowState;
  metadata?: any;
}







































