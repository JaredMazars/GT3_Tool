/**
 * Workflow Registry
 * Registry of all approval workflows with their configuration
 */

import { UserCog, CheckCircle, FileText, Shield, MessageSquare, RefreshCw, FolderOpen, Building, UserCheck } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import type { WorkflowRegistryEntry, WorkflowType } from '@/types/approval';

/**
 * Workflow Registry
 * Maps workflow types to their configuration
 */
export const WORKFLOW_REGISTRY: Record<WorkflowType, WorkflowRegistryEntry> = {
  CHANGE_REQUEST: {
    name: 'Client Partner/Manager Change',
    icon: UserCog,
    defaultRoute: 'dual-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.clientPartnerManagerChangeRequest.findUnique({
        where: { id: workflowId },
        include: {
          Client: {
            select: {
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
              groupCode: true,
            },
          },
          User_ClientPartnerManagerChangeRequest_requestedByIdToUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const changeType = data?.changeType === 'PARTNER' ? 'Client Partner' : 'Client Manager';
      const clientName = data?.Client?.clientNameFull || data?.Client?.clientCode || 'Unknown';
      return `${changeType} Change for ${clientName}`;
    },
    getDisplayDescription: (data: any) => {
      return `Change from ${data?.currentEmployeeName || data?.currentEmployeeCode} to ${data?.proposedEmployeeName || data?.proposedEmployeeCode}`;
    },
  },

  CLIENT_ACCEPTANCE: {
    name: 'Client Acceptance',
    icon: Building,
    defaultRoute: 'client-partner-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.clientAcceptance.findUnique({
        where: { id: workflowId },
        include: {
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
              groupCode: true,
              groupDesc: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const clientName = data?.Client?.clientNameFull || data?.Client?.clientCode || 'Unknown Client';
      return `Client Acceptance for ${clientName}`;
    },
    getDisplayDescription: (data: any) => {
      const riskRating = data?.riskRating || 'Pending';
      const score = data?.overallRiskScore ? ` (${data.overallRiskScore.toFixed(1)}%)` : '';
      return `Risk Rating: ${riskRating}${score}`;
    },
  },

  ACCEPTANCE: {
    name: 'Engagement Acceptance',
    icon: CheckCircle,
    defaultRoute: 'partner-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.clientAcceptanceResponse.findUnique({
        where: { id: workflowId },
        include: {
          Task: {
            select: {
              id: true,
              TaskDesc: true,
              TaskCode: true,
              GSClientID: true,
            },
          },
          Client: {
            select: {
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const taskName = data?.Task?.TaskDesc || data?.Task?.TaskCode || 'Unknown Task';
      return `Engagement Acceptance for ${taskName}`;
    },
    getDisplayDescription: (data: any) => {
      const riskRating = data?.riskRating || 'Unknown';
      return `Risk Rating: ${riskRating}`;
    },
  },

  CONTINUANCE: {
    name: 'Client Continuance',
    icon: RefreshCw,
    defaultRoute: 'partner-approval',
    fetchData: async (workflowId: number) => {
      // Placeholder - implement when continuance workflow is created
      return {
        id: workflowId,
        clientId: 0,
        riskLevel: 0,
      };
    },
    getDisplayTitle: (data: any) => {
      return `Client Continuance Review`;
    },
    getDisplayDescription: (data: any) => {
      return `Continuance assessment for existing client`;
    },
  },

  ENGAGEMENT_LETTER: {
    name: 'Engagement Letter',
    icon: FileText,
    defaultRoute: 'partner-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.task.findUnique({
        where: { id: workflowId },
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          Client: {
            select: {
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
          TaskEngagementLetter: {
            select: {
              filePath: true,
              uploadedAt: true,
              uploadedBy: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const taskName = data?.TaskDesc || data?.TaskCode || 'Unknown Task';
      return `Engagement Letter for ${taskName}`;
    },
    getDisplayDescription: (data: any) => {
      const clientName = data?.Client?.clientNameFull || data?.Client?.clientCode || 'Unknown';
      return `Client: ${clientName}`;
    },
  },

  DPA: {
    name: 'Data Processing Agreement',
    icon: Shield,
    defaultRoute: 'partner-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.task.findUnique({
        where: { id: workflowId },
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          Client: {
            select: {
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
          TaskEngagementLetter: {
            select: {
              dpaFilePath: true,
              dpaUploadedAt: true,
              dpaUploadedBy: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const taskName = data?.TaskDesc || data?.TaskCode || 'Unknown Task';
      return `DPA for ${taskName}`;
    },
    getDisplayDescription: (data: any) => {
      const clientName = data?.Client?.clientNameFull || data?.Client?.clientCode || 'Unknown';
      return `Client: ${clientName}`;
    },
  },

  REVIEW_NOTE: {
    name: 'Review Note',
    icon: MessageSquare,
    defaultRoute: 'assignee-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.reviewNote.findUnique({
        where: { id: workflowId },
        include: {
          Task: {
            select: {
              id: true,
              TaskDesc: true,
              TaskCode: true,
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      return data?.title || 'Review Note';
    },
    getDisplayDescription: (data: any) => {
      const taskName = data?.Task?.TaskDesc || data?.Task?.TaskCode || 'Unknown Task';
      return `Task: ${taskName}`;
    },
  },

  VAULT_DOCUMENT: {
    name: 'Vault Document',
    icon: FolderOpen,
    defaultRoute: 'service-line-admin-approval',
    fetchData: async (workflowId: number) => {
      const document = await prisma.vaultDocument.findUnique({
        where: { id: workflowId },
        select: {
          id: true,
          title: true,
          description: true,
          documentType: true,
          categoryId: true,
          fileName: true,
          mimeType: true,
          scope: true,
          serviceLine: true,
          tags: true,
          effectiveDate: true,
          expiryDate: true,
          documentVersion: true,
          VaultDocumentCategory: {
            select: {
              id: true,
              name: true,
              documentType: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return document;
    },
    getDisplayTitle: (data: any) => {
      const docType = data?.documentType || 'Document';
      const title = data?.title || 'Unknown Document';
      return `${docType}: ${title}`;
    },
    getDisplayDescription: (data: any) => {
      const category = data?.VaultDocumentCategory?.name || 'Uncategorized';
      const scope = data?.scope === 'GLOBAL' ? 'Global' : `${data?.serviceLine || 'Service Line'}`;
      return `Category: ${category} | Scope: ${scope}`;
    },
  },

  INDEPENDENCE_CONFIRMATION: {
    name: 'Independence Confirmation',
    icon: UserCheck,
    defaultRoute: 'partner-approval',
    fetchData: async (workflowId: number) => {
      return await prisma.taskIndependenceConfirmation.findUnique({
        where: { id: workflowId },
        include: {
          TaskTeam: {
            select: {
              id: true,
              taskId: true,
              userId: true,
              role: true,
              Task: {
                select: {
                  id: true,
                  TaskDesc: true,
                  TaskCode: true,
                  Client: {
                    select: {
                      GSClientID: true,
                      clientCode: true,
                      clientNameFull: true,
                    },
                  },
                },
              },
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    },
    getDisplayTitle: (data: any) => {
      const userName = data?.TaskTeam?.User?.name || 'Unknown User';
      const taskName = data?.TaskTeam?.Task?.TaskDesc || data?.TaskTeam?.Task?.TaskCode || 'Unknown Task';
      return `Independence Confirmation: ${userName} - ${taskName}`;
    },
    getDisplayDescription: (data: any) => {
      const clientName = data?.TaskTeam?.Task?.Client?.clientNameFull || data?.TaskTeam?.Task?.Client?.clientCode || 'Unknown';
      return `Client: ${clientName}`;
    },
  },
};

/**
 * Get workflow registry entry
 */
export function getWorkflowRegistry(workflowType: WorkflowType): WorkflowRegistryEntry {
  const entry = WORKFLOW_REGISTRY[workflowType];
  if (!entry) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }
  return entry;
}

/**
 * Fetch workflow data
 */
export async function fetchWorkflowData(
  workflowType: WorkflowType,
  workflowId: number
): Promise<unknown> {
  const registry = getWorkflowRegistry(workflowType);
  return await registry.fetchData(workflowId);
}

/**
 * Get display title for workflow
 */
export function getWorkflowDisplayTitle(
  workflowType: WorkflowType,
  data: unknown
): string {
  const registry = getWorkflowRegistry(workflowType);
  if (registry.getDisplayTitle) {
    return registry.getDisplayTitle(data);
  }
  return registry.name;
}

/**
 * Get display description for workflow
 */
export function getWorkflowDisplayDescription(
  workflowType: WorkflowType,
  data: unknown
): string | null {
  const registry = getWorkflowRegistry(workflowType);
  if (registry.getDisplayDescription) {
    return registry.getDisplayDescription(data);
  }
  return null;
}
