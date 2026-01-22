export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { SERVICE_LINE_CONFIGS } from '@/types/service-line';
import { ServiceLine } from '@/types';
import type { QRMMonitoringStats, MetricStats, ServiceLineMonitoringStats } from '@/types/qrm';

export const GET = secureRoute.query({
  feature: Feature.VIEW_QRM_MONITORING,
  handler: async (request, { user }) => {
    // Helper function to calculate ratio
    const calculateRatio = (numerator: number, denominator: number): number => {
      if (denominator === 0) return 0;
      return (numerator / denominator) * 100;
    };

    // Helper function to create metric stats
    const createMetricStats = (
      numerator: number, 
      denominator: number,
      type: 'approved' | 'completed' | 'confirmed' | 'uploaded'
    ): MetricStats => ({
      [type]: numerator,
      total: denominator,
      ratio: calculateRatio(numerator, denominator),
    });

    // Fetch firm-wide statistics
    
    // 1. Client Acceptance - Total clients with active tasks
    const totalClientsWithActiveTasks = await prisma.client.count({
      where: {
        Task: {
          some: {
            Active: 'Yes'
          }
        }
      }
    });

    // Clients with approved and valid acceptance
    const approvedClients = await prisma.clientAcceptance.count({
      where: {
        approvedAt: { not: null },
        validUntil: { gte: new Date() }
      }
    });

    // 2. Engagement Acceptance - Total active tasks
    const totalActiveTasks = await prisma.task.count({
      where: { Active: 'Yes' }
    });

    // Tasks with completed engagement acceptance questionnaire
    const completedEngagementAcceptance = await prisma.clientAcceptanceResponse.count({
      where: {
        questionnaireType: 'ENGAGEMENT',
        completedAt: { not: null },
        Task: {
          Active: 'Yes'
        }
      }
    });

    // 3. Independence Confirmations - Total task team members on active tasks
    const totalTeamMembers = await prisma.taskTeam.count({
      where: {
        Task: {
          Active: 'Yes'
        }
      }
    });

    // Confirmed independence
    const confirmedIndependence = await prisma.taskIndependenceConfirmation.count({
      where: {
        confirmed: true,
        TaskTeam: {
          Task: {
            Active: 'Yes'
          }
        }
      }
    });

    // 4. Engagement Letters - Tasks with uploaded engagement letters
    const uploadedEngagementLetters = await prisma.taskEngagementLetter.count({
      where: {
        uploaded: true,
        Task: {
          Active: 'Yes'
        }
      }
    });

    // 5. DPA Documents - Tasks with uploaded DPA
    const uploadedDpa = await prisma.taskEngagementLetter.count({
      where: {
        dpaUploaded: true,
        Task: {
          Active: 'Yes'
        }
      }
    });

    // Build firm-wide statistics
    const firmWide = {
      clientAcceptance: createMetricStats(approvedClients, totalClientsWithActiveTasks, 'approved'),
      engagementAcceptance: createMetricStats(completedEngagementAcceptance, totalActiveTasks, 'completed'),
      independenceConfirmations: createMetricStats(confirmedIndependence, totalTeamMembers, 'confirmed'),
      engagementLetters: createMetricStats(uploadedEngagementLetters, totalActiveTasks, 'uploaded'),
      dpaDocuments: createMetricStats(uploadedDpa, totalActiveTasks, 'uploaded'),
    };

    // Fetch per-service-line statistics
    
    // Get all service lines with active tasks
    const serviceLines = await prisma.task.groupBy({
      by: ['ServLineCode'],
      where: {
        Active: 'Yes'
      },
      _count: true,
    });

    const byServiceLine: ServiceLineMonitoringStats[] = [];

    for (const sl of serviceLines) {
      const serviceLine = sl.ServLineCode;
      if (!serviceLine) continue;

      // Tasks for this service line
      const slTotalTasks = await prisma.task.count({
        where: {
          ServLineCode: serviceLine,
          Active: 'Yes'
        }
      });

      // Client Acceptance by service line (via group mapping)
      // Get clients for this service line
      const slTotalClients = await prisma.client.count({
        where: {
          Task: {
            some: {
              ServLineCode: serviceLine,
              Active: 'Yes'
            }
          }
        }
      });

      const slApprovedClients = await prisma.clientAcceptance.count({
        where: {
          approvedAt: { not: null },
          validUntil: { gte: new Date() },
          Client: {
            Task: {
              some: {
                ServLineCode: serviceLine,
                Active: 'Yes'
              }
            }
          }
        }
      });

      // Engagement Acceptance by service line
      const slCompletedEngagementAcceptance = await prisma.clientAcceptanceResponse.count({
        where: {
          questionnaireType: 'ENGAGEMENT',
          completedAt: { not: null },
          Task: {
            ServLineCode: serviceLine,
            Active: 'Yes'
          }
        }
      });

      // Independence Confirmations by service line
      const slTotalTeamMembers = await prisma.taskTeam.count({
        where: {
          Task: {
            ServLineCode: serviceLine,
            Active: 'Yes'
          }
        }
      });

      const slConfirmedIndependence = await prisma.taskIndependenceConfirmation.count({
        where: {
          confirmed: true,
          TaskTeam: {
            Task: {
              ServLineCode: serviceLine,
              Active: 'Yes'
            }
          }
        }
      });

      // Engagement Letters by service line
      const slUploadedEngagementLetters = await prisma.taskEngagementLetter.count({
        where: {
          uploaded: true,
          Task: {
            ServLineCode: serviceLine,
            Active: 'Yes'
          }
        }
      });

      // DPA Documents by service line
      const slUploadedDpa = await prisma.taskEngagementLetter.count({
        where: {
          dpaUploaded: true,
          Task: {
            ServLineCode: serviceLine,
            Active: 'Yes'
          }
        }
      });

      byServiceLine.push({
        serviceLine,
        serviceLineName: formatServiceLineName(serviceLine),
        description: SERVICE_LINE_CONFIGS[serviceLine as ServiceLine]?.description || '',
        clientAcceptance: createMetricStats(slApprovedClients, slTotalClients, 'approved'),
        engagementAcceptance: createMetricStats(slCompletedEngagementAcceptance, slTotalTasks, 'completed'),
        independenceConfirmations: createMetricStats(slConfirmedIndependence, slTotalTeamMembers, 'confirmed'),
        engagementLetters: createMetricStats(slUploadedEngagementLetters, slTotalTasks, 'uploaded'),
        dpaDocuments: createMetricStats(slUploadedDpa, slTotalTasks, 'uploaded'),
      });
    }

    // Sort by service line name
    byServiceLine.sort((a, b) => a.serviceLineName.localeCompare(b.serviceLineName));

    const response: QRMMonitoringStats = {
      firmWide,
      byServiceLine,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  },
});
