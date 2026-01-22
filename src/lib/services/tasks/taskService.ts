import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';
import { TaskId } from '@/types/branded';
import { enrichObjectsWithEmployeeStatus } from '@/lib/services/employees/employeeStatusService';

export interface TaskFilters {
  userId: string;
  accessibleServiceLines: string[];
  search?: string;
  page?: number;
  limit?: number;
  serviceLine?: string;
  includeArchived?: boolean;
  clientCode?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskListResult {
  tasks: Array<{
    id: number;
    name: string | null;
    description: string | null;
    TaskDesc: string;
    ServLineDesc: string;
    status: string;
    archived: boolean;
    GSClientID: string | null;  // External GUID - for client relationship
    taxYear: number | null;
    createdAt: Date;
    updatedAt: Date;
    Client: {
      id: number;
      GSClientID: string;
      clientNameFull: string | null;
      clientCode: string | null;
    } | null;
    _count: {
      MappedAccount: number;
      TaxAdjustment: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get tasks with pagination and filtering
 * Optimized with database-level filtering instead of in-memory
 */
export async function getTasksWithPagination(
  filters: TaskFilters
): Promise<TaskListResult> {
  return withRetry(
    async () => {
      const {
        userId,
        accessibleServiceLines,
        search = '',
        page = 1,
        limit = 50,
        serviceLine,
        includeArchived = false,
        clientCode,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * Math.min(limit, 100);
      const take = Math.min(limit, 100);

      // Build where clause for database-level filtering
      const where: any = {
        TaskTeam: {
          some: {
            userId,
          },
        },
        ServLineCode: {
          in: accessibleServiceLines,
        },
      };

      // Filter by archived status (Active field)
      if (!includeArchived) {
        where.Active = 'Yes';
      }

      // Filter by specific service line
      if (serviceLine) {
        where.ServLineCode = serviceLine;
      }

      // Filter by client code - convert to GSClientID
      if (clientCode) {
        // Look up client by clientCode to get GSClientID
        const client = await prisma.client.findUnique({
          where: { clientCode },
          select: { GSClientID: true },
        });
        if (client) {
          where.GSClientID = client.GSClientID;
        } else {
          // Client not found, return empty result
          return {
            tasks: [],
            pagination: {
              page,
              limit: take,
              total: 0,
              totalPages: 0,
            },
          };
        }
      }

      // Add search filter
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
          { TaskDesc: { contains: search } },
        ];
      }

      // Build orderBy
      const orderBy: any = {};
      const validSortFields = ['name', 'updatedAt', 'createdAt', 'taxYear'];
      if (validSortFields.includes(sortBy)) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.updatedAt = 'desc';
      }

      // Get total count
      const total = await prisma.task.count({ where });

      // Get tasks with optimized query
      const rawTasks = await prisma.task.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          ServLineDesc: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
      });

      // Transform raw tasks to match the interface
      const tasks = rawTasks.map(task => ({
        id: task.id,
        name: task.TaskDesc,
        description: null,
        TaskDesc: task.TaskDesc,
        ServLineDesc: task.ServLineDesc,
        status: task.Active,
        archived: false,
        GSClientID: task.GSClientID,
        taxYear: null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        Client: task.Client,
        _count: task._count,
      }));

      return {
        tasks,
        pagination: {
          page,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get tasks with pagination'
  );
}

/**
 * Get tasks with counts for a user, optionally filtered by service line
 * Single optimized query with proper includes and field selection
 */
export async function getTasksWithCounts(
  userId: string,
  serviceLine?: string,
  includeArchived = false
): Promise<Array<{
  id: number;
  name: string | null;
  description: string | null;
  TaskDesc: string;
  ServLineDesc: string;
  status: string;
  archived: boolean;
  GSClientID: string | null;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
  Client: {
    id: number;
    GSClientID: string;
    clientNameFull: string | null;
    clientCode: string | null;
  } | null;
  _count: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
}>> {
  return withRetry(
    async () => {
      // Build where clause
      const where: any = {
        TaskTeam: {
          some: {
            userId,
          },
        },
      };

      // Filter by service line if provided
      if (serviceLine) {
        where.ServLineCode = serviceLine;
      }

      // Filter archived if not included
      if (!includeArchived) {
        where.Active = 'Yes';
      }

      // Single optimized query with counts
      const rawTasks = await prisma.task.findMany({
        where,
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          ServLineDesc: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Transform raw tasks to match the interface
      const tasks = rawTasks.map(task => ({
        id: task.id,
        name: task.TaskDesc,
        description: null,
        TaskDesc: task.TaskDesc,
        ServLineDesc: task.ServLineDesc,
        status: task.Active,
        archived: false,
        GSClientID: task.GSClientID,
        taxYear: null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        Client: task.Client,
        _count: task._count,
      }));

      return tasks;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get tasks with counts'
  );
}

/**
 * Get a single task with detailed counts
 */
export async function getTaskWithCounts(taskId: TaskId): Promise<{
  id: number;
  name: string | null;
  description: string | null;
  TaskDesc: string;
  ServLineCode: string;
  ServLineDesc: string;
  status: string;
  archived: boolean;
  GSClientID: string | null;
  taxYear: number | null;
  taxPeriodStart: Date | null;
  taxPeriodEnd: Date | null;
  assessmentYear: string | null;
  submissionDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
} | null> {
  return withRetry(
    async () => {
      const rawTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          ServLineCode: true,
          ServLineDesc: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
      });

      if (!rawTask) return null;

      return {
        id: rawTask.id,
        name: rawTask.TaskDesc,
        description: null,
        TaskDesc: rawTask.TaskDesc,
        ServLineCode: rawTask.ServLineCode,
        ServLineDesc: rawTask.ServLineDesc,
        status: rawTask.Active,
        archived: false,
        GSClientID: rawTask.GSClientID,
        taxYear: null,
        taxPeriodStart: null,
        taxPeriodEnd: null,
        assessmentYear: null,
        submissionDeadline: null,
        createdAt: rawTask.createdAt,
        updatedAt: rawTask.updatedAt,
        _count: rawTask._count,
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get task with counts'
  );
}

/**
 * Get task by ID with basic fields
 */
export async function getTaskById(taskId: TaskId) {
  return withRetry(
    async () => {
      const rawTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          TaskCode: true,
          ServLineCode: true,
          ServLineDesc: true,
          Active: true,
          TaskPartner: true,
          TaskPartnerName: true,
          TaskManager: true,
          TaskManagerName: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
        },
      });

      if (!rawTask) return null;

      const task = {
        id: rawTask.id,
        GSClientID: rawTask.GSClientID,
        name: rawTask.TaskDesc,
        description: null,
        TaskDesc: rawTask.TaskDesc,
        TaskCode: rawTask.TaskCode,
        ServLineCode: rawTask.ServLineCode,
        ServLineDesc: rawTask.ServLineDesc,
        status: rawTask.Active,
        Active: rawTask.Active,
        taxYear: null,
        taxPeriodStart: null,
        taxPeriodEnd: null,
        assessmentYear: null,
        submissionDeadline: null,
        TaskPartner: rawTask.TaskPartner,
        TaskPartnerName: rawTask.TaskPartnerName,
        TaskManager: rawTask.TaskManager,
        TaskManagerName: rawTask.TaskManagerName,
        createdBy: rawTask.createdBy,
        createdAt: rawTask.createdAt,
        updatedAt: rawTask.updatedAt,
        Client: rawTask.Client,
      };

      // Enrich with employee status
      await enrichObjectsWithEmployeeStatus([task], [
        { codeField: 'TaskPartner', statusField: 'TaskPartnerStatus' },
        { codeField: 'TaskManager', statusField: 'TaskManagerStatus' },
      ]);

      return task;
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get task by ID'
  );
}

/**
 * Create a new task
 */
export async function createTask(data: {
  GSClientID?: string | null;
  clientCode?: string | null;
  TaskCode: string;
  name: string;
  description?: string | null;
  taxYear?: number | null;
  taxPeriodStart?: Date | null;
  taxPeriodEnd?: Date | null;
  assessmentYear?: string | null;
  submissionDeadline?: Date | null;
  createdBy?: string | null;
}) {
  return withRetry(
    async () => {
      // Get GSClientID if clientCode is provided
      let GSClientID = data.GSClientID;
      if (!GSClientID && data.clientCode) {
        const client = await prisma.client.findUnique({
          where: { clientCode: data.clientCode },
          select: { GSClientID: true },
        });
        GSClientID = client?.GSClientID;
      }

      return await prisma.task.create({
        data: {
          ...(GSClientID && { GSClientID }),
          GSTaskID: crypto.randomUUID(),
          TaskCode: data.TaskCode,
          TaskDesc: data.name,
          taskYear: new Date().getFullYear(),
          TaskPartner: '',
          TaskPartnerName: '',
          TaskManager: '',
          TaskManagerName: '',
          OfficeCode: '',
          SLGroup: '',
          ServLineCode: '',
          ServLineDesc: '',
          Active: 'Yes',
          TaskDateOpen: new Date(),
          updatedAt: new Date(),
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Create task'
  );
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: TaskId,
  data: {
    name?: string;
    description?: string | null;
    status?: string;
    archived?: boolean;
    assessmentYear?: string | null;
    submissionDeadline?: Date | null;
    taxPeriodStart?: Date | null;
    taxPeriodEnd?: Date | null;
    taxYear?: number | null;
  }
) {
  return withRetry(
    async () => {
      // Map the input data to actual Task model fields
      const updateData: any = {};
      if (data.name !== undefined) updateData.TaskDesc = data.name;
      if (data.status !== undefined) updateData.Active = data.status;
      
      return await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Update task'
  );
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: TaskId) {
  return withRetry(
    async () => {
      return await prisma.task.delete({
        where: { id: taskId },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Delete task'
  );
}

/**
 * Archive a task
 */
export async function archiveTask(taskId: TaskId) {
  return withRetry(
    async () => {
      return await prisma.task.update({
        where: { id: taskId },
        data: { Active: 'No' },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Archive task'
  );
}

/**
 * Get task team members with all allocations
 * Returns all allocation periods for each user
 */
export async function getTaskTeam(taskId: TaskId) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.findMany({
        where: { taskId },
        select: {
          id: true,
          userId: true,
          role: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          actualHours: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [
          { userId: 'asc' },
          { startDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get task team'
  );
}

/**
 * Add team member to task with optional allocation details
 * Note: Overlap validation should be done by the caller
 */
export async function addTeamMember(
  taskId: TaskId,
  userId: string,
  role: string = 'VIEWER',
  allocationDetails?: {
    startDate?: Date | null;
    endDate?: Date | null;
    allocatedHours?: number | null;
    allocatedPercentage?: number | null;
  }
) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.create({
        data: {
          taskId,
          userId,
          role,
          ...(allocationDetails && {
            startDate: allocationDetails.startDate,
            endDate: allocationDetails.endDate,
            allocatedHours: allocationDetails.allocatedHours,
            allocatedPercentage: allocationDetails.allocatedPercentage,
          }),
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Add team member'
  );
}

/**
 * Remove team member from task (removes ALL allocations)
 */
export async function removeTeamMember(taskId: TaskId, userId: string) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.deleteMany({
        where: {
          taskId,
          userId,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Remove team member'
  );
}

/**
 * Get all allocation periods for a specific user on a task
 */
export async function getUserAllocations(taskId: TaskId, userId: string) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.findMany({
        where: {
          taskId,
          userId,
        },
        select: {
          id: true,
          role: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          actualHours: true,
          createdAt: true,
        },
        orderBy: [
          { startDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get user allocations'
  );
}

/**
 * Add a new allocation period for an existing team member
 * Note: Overlap and role validation should be done by the caller
 */
export async function addAllocationPeriod(
  taskId: TaskId,
  userId: string,
  allocationData: {
    role: string;
    startDate?: Date | null;
    endDate?: Date | null;
    allocatedHours?: number | null;
    allocatedPercentage?: number | null;
  }
) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.create({
        data: {
          taskId,
          userId,
          role: allocationData.role,
          startDate: allocationData.startDate,
          endDate: allocationData.endDate,
          allocatedHours: allocationData.allocatedHours,
          allocatedPercentage: allocationData.allocatedPercentage,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Add allocation period'
  );
}

/**
 * Update team member role
 */
export async function updateTeamRole(
  taskId: TaskId,
  userId: string,
  role: string
) {
  return withRetry(
    async () => {
      return await prisma.taskTeam.updateMany({
        where: {
          taskId,
          userId,
        },
        data: {
          role,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Update team role'
  );
}
