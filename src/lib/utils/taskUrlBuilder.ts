/**
 * Task URL Builder Utility
 * 
 * Constructs properly formatted task URLs with service line context.
 * Uses the correct URL structure: /dashboard/[serviceLine]/[subServiceLineGroup]/clients/[clientId]/tasks/[taskId]
 */

import { ROUTES } from '@/constants/routes';

interface TaskUrlParams {
  taskId: number;
  serviceLine?: string;
  subServiceLineGroup?: string;
  clientId?: number;
  tab?: string;
}

/**
 * Build a task detail URL
 * 
 * For notifications and general use, always returns the simple format `/dashboard/tasks/[id]`
 * which auto-redirects to the correct hierarchical URL. This ensures users can access tasks
 * they're members of even if they don't have service line access.
 * 
 * @param params - Task URL parameters
 * @returns Task URL
 * 
 * @example
 * // Simple format (recommended for notifications)
 * buildTaskUrl({ taskId: 123 })
 * // Returns: /dashboard/tasks/123
 * 
 * @example
 * // With tab parameter
 * buildTaskUrl({ taskId: 123, tab: 'mapping' })
 * // Returns: /dashboard/tasks/123?tab=mapping
 * 
 * @example
 * // With full context (for direct linking within the app)
 * buildTaskUrl({ 
 *   taskId: 123, 
 *   serviceLine: 'TAX', 
 *   subServiceLineGroup: 'TAX-COMP', 
 *   clientId: 456,
 *   useFullPath: true 
 * })
 * // Returns: /dashboard/tax/TAX-COMP/clients/456/tasks/123
 */
export function buildTaskUrl(params: TaskUrlParams & { useFullPath?: boolean }): string {
  const { taskId, serviceLine, subServiceLineGroup, clientId, tab, useFullPath } = params;
  
  let url: string;
  
  // Use full hierarchical path only if explicitly requested AND all required params are present
  if (useFullPath && serviceLine && subServiceLineGroup && clientId) {
    url = `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${clientId}/tasks/${taskId}`;
  } else {
    // Default to simple task URL for maximum accessibility
    url = `${ROUTES.DASHBOARD.ROOT}/tasks/${taskId}`;
  }
  
  // Add tab parameter if provided
  if (tab) {
    url += `?tab=${tab}`;
  }
  
  return url;
}

/**
 * Extract task URL parameters from a task object with service line mapping
 * 
 * @param task - Task object with ServLineCode, GSClientID, and optional Client relation
 * @param serviceLineMapping - Service line external mapping with SubServlineGroupCode and masterCode
 * @param tab - Optional tab parameter
 * @returns Task URL parameters ready for buildTaskUrl
 * 
 * @example
 * const task = await prisma.task.findUnique({
 *   where: { id: taskId },
 *   select: { 
 *     ServLineCode: true, 
 *     GSClientID: true,
 *     Client: { select: { id: true } }
 *   }
 * });
 * 
 * const mapping = await prisma.serviceLineExternal.findFirst({
 *   where: { ServLineCode: task.ServLineCode },
 *   select: { SubServlineGroupCode: true, masterCode: true }
 * });
 * 
 * const urlParams = extractTaskUrlParams(task, mapping, 'mapping');
 * const url = buildTaskUrl({ taskId: task.id, ...urlParams });
 */
export function extractTaskUrlParams(
  task: { 
    ServLineCode?: string | null; 
    GSClientID?: string | null; 
    Client?: { id: number } | null;
  },
  serviceLineMapping: {
    SubServlineGroupCode?: string | null;
    masterCode?: string | null;
  } | null,
  tab?: string
): Omit<TaskUrlParams, 'taskId'> {
  return {
    serviceLine: serviceLineMapping?.masterCode ?? undefined,
    subServiceLineGroup: serviceLineMapping?.SubServlineGroupCode ?? undefined,
    clientId: task.Client?.id ?? undefined,
    tab,
  };
}























