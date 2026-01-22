export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { canApproveAcceptance, canApproveEngagementLetter } from '@/lib/services/tasks/taskAuthorization';
import { approvalService } from '@/lib/services/approvals/approvalService';
import type {
  ApprovalsResponse,
  ChangeRequestApproval,
  ClientAcceptanceApproval,
  EngagementAcceptanceApproval,
  ReviewNoteApproval,
  IndependenceConfirmationApproval,
} from '@/types/approvals';

/**
 * GET /api/approvals
 * Get all pending or archived approvals for the current user
 * 
 * Query Parameters:
 * - archived: boolean (optional) - if true, fetch archived (resolved) approvals
 * 
 * Returns:
 * - Change requests where user's employee code matches proposedEmployeeCode
 * - Client acceptances where user can approve
 * - Engagement letters where user can approve
 * - DPAs where user can approve
 * - Review notes where user is assignee or raiser with actionable status
 * - Centralized approvals (VAULT_DOCUMENT, etc.) from the unified approval system
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    try {
      // Get query parameter for archived filter
      const { searchParams } = new URL(request.url);
      const showArchived = searchParams.get('archived') === 'true';

      // Get user's employee code for change request matching
      const userWithEmployee = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          email: true,
        },
      });

      // Find matching employee record
      const employee = userWithEmployee?.email
        ? await prisma.employee.findFirst({
            where: {
              WinLogon: userWithEmployee.email,
            },
            select: {
              EmpCode: true,
            },
          })
        : null;

      // 1. Get change requests for this user (pending or archived)
      // Include requests where user is EITHER:
      // - The proposed employee (needs to approve new assignment)
      // - The current employee (needs to approve if dual approval required)
      const changeRequests: ChangeRequestApproval[] = employee
        ? await prisma.clientPartnerManagerChangeRequest
            .findMany({
              where: {
                status: showArchived
                  ? { in: ['APPROVED', 'REJECTED', 'CANCELLED'] }
                  : 'PENDING',
                OR: showArchived
                  ? [
                      // For archived: show all where user was proposed or current employee
                      { proposedEmployeeCode: employee.EmpCode },
                      { currentEmployeeCode: employee.EmpCode },
                    ]
                  : [
                      // For active: proposed employee needs to approve
                      { proposedEmployeeCode: employee.EmpCode },
                      // Current employee needs to approve (if dual approval and not yet approved)
                      {
                        currentEmployeeCode: employee.EmpCode,
                        requiresDualApproval: true,
                        currentEmployeeApprovedAt: null,
                      },
                    ],
              },
              select: {
                id: true,
                clientId: true,
                changeType: true,
                currentEmployeeCode: true,
                currentEmployeeName: true,
                proposedEmployeeCode: true,
                proposedEmployeeName: true,
                reason: true,
                status: true,
                requestedAt: true,
                requestedById: true,
                resolvedAt: true,
                resolvedById: true,
                resolutionComment: true,
                requiresDualApproval: true,
                currentEmployeeApprovedAt: true,
                currentEmployeeApprovedById: true,
                proposedEmployeeApprovedAt: true,
                proposedEmployeeApprovedById: true,
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
                    name: true,
                  },
                },
                User_ClientPartnerManagerChangeRequest_resolvedByIdToUser: {
                  select: {
                    name: true,
                  },
                },
                User_ClientPartnerManagerChangeRequest_currentEmployeeApprovedByIdToUser: {
                  select: {
                    name: true,
                  },
                },
                User_ClientPartnerManagerChangeRequest_proposedEmployeeApprovedByIdToUser: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: showArchived
                ? { resolvedAt: 'desc' }
                : { requestedAt: 'desc' },
            })
            .then((requests) =>
              requests.map((req) => ({
                id: req.id,
                clientId: req.clientId,
                changeType: req.changeType as 'PARTNER' | 'MANAGER',
                currentEmployeeCode: req.currentEmployeeCode,
                currentEmployeeName: req.currentEmployeeName,
                proposedEmployeeCode: req.proposedEmployeeCode,
                proposedEmployeeName: req.proposedEmployeeName,
                reason: req.reason,
                status: req.status,
                requestedAt: req.requestedAt,
                requestedById: req.requestedById,
                requestedByName: req.User_ClientPartnerManagerChangeRequest_requestedByIdToUser?.name ?? null,
                resolvedAt: req.resolvedAt,
                resolvedById: req.resolvedById,
                resolvedByName: req.User_ClientPartnerManagerChangeRequest_resolvedByIdToUser?.name ?? null,
                resolutionComment: req.resolutionComment,
                requiresDualApproval: req.requiresDualApproval,
                currentEmployeeApprovedAt: req.currentEmployeeApprovedAt,
                currentEmployeeApprovedById: req.currentEmployeeApprovedById,
                currentEmployeeApprovedByName: req.User_ClientPartnerManagerChangeRequest_currentEmployeeApprovedByIdToUser?.name ?? null,
                proposedEmployeeApprovedAt: req.proposedEmployeeApprovedAt,
                proposedEmployeeApprovedById: req.proposedEmployeeApprovedById,
                proposedEmployeeApprovedByName: req.User_ClientPartnerManagerChangeRequest_proposedEmployeeApprovedByIdToUser?.name ?? null,
                client: {
                  GSClientID: req.Client.GSClientID,
                  clientCode: req.Client.clientCode,
                  clientNameFull: req.Client.clientNameFull,
                  groupCode: req.Client.groupCode,
                },
              }))
            )
        : [];

      // 2. Get tasks with client acceptance approvals (pending or archived)
      // First get all tasks where user is on the team and acceptance is completed
      const potentialAcceptanceTasks = await prisma.task.findMany({
        where: {
          TaskTeam: {
            some: {
              userId: user.id,
            },
          },
          ClientAcceptanceResponse: {
            some: {
              completedAt: {
                not: null,
              },
              reviewedAt: showArchived
                ? { not: null }
                : null,
            },
          },
        },
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          GSClientID: true,
          ServLineCode: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
          ClientAcceptanceResponse: {
            where: {
              completedAt: {
                not: null,
              },
              reviewedAt: showArchived
                ? { not: null }
                : null,
            },
            select: {
              id: true,
              completedAt: true,
              completedBy: true,
              riskRating: true,
              overallRiskScore: true,
              reviewedAt: true,
              reviewedBy: true,
            },
            take: 1,
            orderBy: showArchived
              ? { reviewedAt: 'desc' }
              : { completedAt: 'desc' },
          },
        },
      });

      // OPTIMIZATION: Batch authorization checks to avoid N+1 queries
      // Pre-fetch all service line mappings and user permissions at once
      const engagementAcceptances: EngagementAcceptanceApproval[] = [];
      
      if (potentialAcceptanceTasks.length > 0) {
        // Check if user is system admin (one query for all tasks)
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        const isSystemAdmin = userRecord?.role === 'SYSTEM_ADMIN';

        // Get all unique ServLineCodes
        const servLineCodes = [...new Set(potentialAcceptanceTasks.map(t => t.ServLineCode))];

        // Batch fetch service line mappings (one query instead of N queries)
        const serviceLineMappings = await prisma.serviceLineExternal.findMany({
          where: {
            ServLineCode: { in: servLineCodes },
          },
          select: {
            ServLineCode: true,
            SubServlineGroupCode: true,
            masterCode: true,
          },
        });

        // Create lookup map for O(1) access
        const servLineToMapping = new Map(
          serviceLineMappings.map(m => [m.ServLineCode, m])
        );

        // Get all unique SubServlineGroupCodes
        const subGroupCodes = [...new Set(
          serviceLineMappings
            .map(m => m.SubServlineGroupCode)
            .filter((code): code is string => code !== null)
        )];

        // Batch fetch user's service line roles (one query instead of N queries)
        const userServiceLineRoles = subGroupCodes.length > 0 ? await prisma.serviceLineUser.findMany({
          where: {
            userId: user.id,
            subServiceLineGroup: { in: subGroupCodes },
          },
          select: {
            subServiceLineGroup: true,
            role: true,
          },
        }) : [];

        // Create lookup map for O(1) access
        const subGroupToRole = new Map(
          userServiceLineRoles.map(r => [r.subServiceLineGroup, r.role])
        );

        // Now efficiently check approval permission for each task using pre-fetched data
        for (const task of potentialAcceptanceTasks) {
          if (!task.Client) continue; // Skip if no client

          // Check approval permission using pre-fetched data
          let canApprove = isSystemAdmin; // System admins can approve all

          if (!canApprove) {
            const mapping = servLineToMapping.get(task.ServLineCode);
            if (mapping?.SubServlineGroupCode) {
              const userRole = subGroupToRole.get(mapping.SubServlineGroupCode);
              canApprove = userRole === 'ADMINISTRATOR' || userRole === 'PARTNER';
            }
          }

          if (canApprove && task.ClientAcceptanceResponse[0]) {
            const response = task.ClientAcceptanceResponse[0];
            const mapping = servLineToMapping.get(task.ServLineCode);
            
            engagementAcceptances.push({
              taskId: task.id,
              taskName: task.TaskDesc,
              taskCode: task.TaskCode,
              clientId: task.Client.id,
              clientGSID: task.Client.GSClientID,
              clientCode: task.Client.clientCode,
              clientName: task.Client.clientNameFull,
              servLineCode: task.ServLineCode,
              subServlineGroupCode: mapping?.SubServlineGroupCode || null,
              masterCode: mapping?.masterCode || null,
              acceptanceResponseId: response.id,
              completedAt: response.completedAt!,
              completedBy: response.completedBy,
              riskRating: response.riskRating,
              overallRiskScore: response.overallRiskScore,
              reviewedAt: response.reviewedAt,
              reviewedBy: response.reviewedBy,
            });
          }
        }
      }

      // 2.5. Get client-level acceptance approvals
      // NOTE: Client acceptances now use the centralized approval system (CLIENT_ACCEPTANCE workflow)
      // They are automatically included in centralizedApprovals below via approvalService.getUserApprovals()
      // This array is kept for backwards compatibility with legacy code
      const clientAcceptances: ClientAcceptanceApproval[] = [];

      // 3. Get review notes requiring action (active or archived)
      // User is either assignee or raiser and note is in actionable status
      const reviewNotes = await prisma.reviewNote.findMany({
        where: {
          OR: [
            { assignedTo: user.id },
            { raisedBy: user.id },
            { currentOwner: user.id },
          ],
          status: {
            in: showArchived
              ? ['CLEARED', 'REJECTED']
              : ['OPEN', 'IN_PROGRESS', 'ADDRESSED'],
          },
        },
        select: {
          id: true,
          taskId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          raisedBy: true,
          assignedTo: true,
          currentOwner: true,
          createdAt: true,
          updatedAt: true,
          clearedAt: true,
          clearedBy: true,
          clearanceComment: true,
          rejectedAt: true,
          rejectionReason: true,
          Task: {
            select: {
              TaskDesc: true,
              TaskCode: true,
              GSClientID: true,
              ServLineCode: true,
              Client: {
                select: {
                  id: true,
                  GSClientID: true,
                },
              },
            },
          },
          User_ReviewNote_raisedByToUser: {
            select: {
              name: true,
            },
          },
          User_ReviewNote_assignedToToUser: {
            select: {
              name: true,
            },
          },
          User_ReviewNote_clearedByToUser: {
            select: {
              name: true,
            },
          },
        },
        orderBy: showArchived
          ? [
              { clearedAt: 'desc' },
              { rejectedAt: 'desc' },
              { updatedAt: 'desc' },
            ]
          : [
              { priority: 'desc' },
              { dueDate: 'asc' },
              { createdAt: 'desc' },
            ],
      });

      // Get unique service line codes to fetch mappings
      const uniqueServLineCodes = [...new Set(
        reviewNotes
          .filter((note) => note.Task.Client !== null)
          .map((note) => note.Task.ServLineCode)
      )];

      // Fetch service line external mappings
      const serviceLineMappings = await prisma.serviceLineExternal.findMany({
        where: {
          ServLineCode: {
            in: uniqueServLineCodes,
          },
        },
        select: {
          ServLineCode: true,
          SubServlineGroupCode: true,
          masterCode: true,
        },
      });

      // Create a map for quick lookup
      const serviceLineMap = new Map(
        serviceLineMappings.map((sl) => [sl.ServLineCode, sl])
      );

      const reviewNoteApprovals: ReviewNoteApproval[] = reviewNotes
        .filter((note) => note.Task.Client !== null)
        .map((note) => {
          const serviceLineMapping = serviceLineMap.get(note.Task.ServLineCode);
          return {
            id: note.id,
            taskId: note.taskId,
            taskName: note.Task.TaskDesc,
            taskCode: note.Task.TaskCode,
            title: note.title,
            description: note.description,
            status: note.status,
            priority: note.priority,
            dueDate: note.dueDate,
            raisedBy: note.raisedBy,
            raisedByName: note.User_ReviewNote_raisedByToUser?.name ?? null,
            assignedTo: note.assignedTo,
            assignedToName: note.User_ReviewNote_assignedToToUser?.name ?? null,
            currentOwner: note.currentOwner,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            clearedAt: note.clearedAt,
            clearedBy: note.clearedBy,
            clearedByName: note.User_ReviewNote_clearedByToUser?.name ?? null,
            clearanceComment: note.clearanceComment,
            rejectedAt: note.rejectedAt,
            rejectionReason: note.rejectionReason,
            actionRequired:
              note.assignedTo === user.id || note.currentOwner === user.id
                ? ('ASSIGNEE' as const)
                : ('RAISER' as const),
            clientId: note.Task.Client!.id,
            clientGSID: note.Task.Client!.GSClientID,
            servLineCode: note.Task.ServLineCode,
            subServlineGroupCode: serviceLineMapping?.SubServlineGroupCode ?? null,
            masterCode: serviceLineMapping?.masterCode ?? null,
          };
        });

      // 4. Get independence confirmations (only pending ones)
      const rawIndependenceConfirmations = !showArchived
        ? await prisma.taskIndependenceConfirmation.findMany({
            where: {
              confirmed: false,
              TaskTeam: {
                userId: user.id,
              },
            },
            select: {
              id: true,
              taskTeamId: true,
              confirmed: true,
              confirmedAt: true,
              createdAt: true,
              TaskTeam: {
                select: {
                  id: true,
                  role: true,
                  createdAt: true,
                  Task: {
                    select: {
                      id: true,
                      TaskDesc: true,
                      TaskCode: true,
                      ServLineCode: true,
                      GSClientID: true,
                      Client: {
                        select: {
                          id: true,
                          GSClientID: true,
                          clientCode: true,
                          clientNameFull: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        : [];

      // Map independence confirmations to approval format with service line mappings
      const independenceConfirmations: IndependenceConfirmationApproval[] = [];
      
      for (const ic of rawIndependenceConfirmations) {
        if (!ic.TaskTeam?.Task?.Client) continue; // Only include tasks with clients
        
        // Get service line mapping for navigation
        const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
          where: { ServLineCode: ic.TaskTeam.Task.ServLineCode },
          select: { 
            SubServlineGroupCode: true,
            masterCode: true,
          },
        });
        
        independenceConfirmations.push({
          id: ic.id,
          taskTeamId: ic.taskTeamId,
          taskId: ic.TaskTeam.Task.id,
          taskName: ic.TaskTeam.Task.TaskDesc,
          taskCode: ic.TaskTeam.Task.TaskCode,
          clientId: ic.TaskTeam.Task.Client.id,
          clientGSID: ic.TaskTeam.Task.Client.GSClientID,
          clientCode: ic.TaskTeam.Task.Client.clientCode,
          clientName: ic.TaskTeam.Task.Client.clientNameFull,
          role: ic.TaskTeam.role,
          servLineCode: ic.TaskTeam.Task.ServLineCode,
          subServlineGroupCode: serviceLineMapping?.SubServlineGroupCode || null,
          masterCode: serviceLineMapping?.masterCode || null,
          addedAt: ic.TaskTeam.createdAt,
        });
      }

      // 5. Get centralized approvals (VAULT_DOCUMENT, etc.)
      // These use the unified approval system
      const centralizedData = await approvalService.getUserApprovals(user.id);
      
      // Filter based on archived flag
      // Note: Archived/completed centralized approvals are not yet implemented
      const centralizedApprovals = showArchived
        ? []
        : centralizedData.approvals;

      // Calculate total count
      const totalCount =
        changeRequests.length +
        clientAcceptances.length +
        engagementAcceptances.length +
        reviewNoteApprovals.length +
        independenceConfirmations.length +
        centralizedApprovals.length;

      const response: ApprovalsResponse = {
        changeRequests,
        clientAcceptances,
        engagementAcceptances,
        reviewNotes: reviewNoteApprovals,
        independenceConfirmations,
        centralizedApprovals,
        totalCount,
      };

      logger.info('Fetched approvals for user', {
        userId: user.id,
        showArchived,
        totalCount,
        changeRequests: changeRequests.length,
        clientAcceptances: clientAcceptances.length,
        engagementAcceptances: engagementAcceptances.length,
        reviewNotes: reviewNoteApprovals.length,
        independenceConfirmations: independenceConfirmations.length,
        centralizedApprovals: centralizedApprovals.length,
      });

      return NextResponse.json(successResponse(response), {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      logger.error('Error fetching approvals', { userId: user.id, error });
      throw error;
    }
  },
});
