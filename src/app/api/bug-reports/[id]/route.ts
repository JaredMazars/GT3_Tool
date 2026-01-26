import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { UpdateBugReportSchema } from '@/lib/validation/schemas';
import { deleteBugReportScreenshot } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

/**
 * PATCH /api/bug-reports/[id]
 * Update a bug report (system admin only)
 */
export const PATCH = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BUG_REPORTS,
  schema: UpdateBugReportSchema,
  handler: async (request, { user, data, params }) => {
    try {
      const resolvedParams = await params;
      const id = parseInt(resolvedParams.id as string, 10);

      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid bug report ID' },
          { status: 400 }
        );
      }

      // Check if bug report exists
      const existingReport = await prisma.bugReport.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existingReport) {
        return NextResponse.json(
          { error: 'Bug report not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: any = {};

      if (data.status) {
        updateData.status = data.status;
        
        // Set timestamp and user based on status
        if (data.status === 'TESTING' && existingReport.status !== 'TESTING') {
          updateData.testedAt = new Date();
          updateData.testedBy = user.id;
        } else if (data.status === 'RESOLVED' && existingReport.status !== 'RESOLVED') {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = user.id;
        }
      }

      if (data.priority) {
        updateData.priority = data.priority;
      }

      if (data.resolutionNotes !== undefined) {
        updateData.resolutionNotes = data.resolutionNotes;
      }

      // Update bug report
      const updatedReport = await prisma.bugReport.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          reportedBy: true,
          reportedAt: true,
          url: true,
          description: true,
          screenshotPath: true,
          status: true,
          testedAt: true,
          testedBy: true,
          resolvedAt: true,
          resolvedBy: true,
          resolutionNotes: true,
          priority: true,
          User_BugReport_reportedByToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          User_BugReport_testedByToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          User_BugReport_resolvedByToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Transform response
      const transformedReport = {
        ...updatedReport,
        reporter: updatedReport.User_BugReport_reportedByToUser,
        tester: updatedReport.User_BugReport_testedByToUser,
        resolver: updatedReport.User_BugReport_resolvedByToUser,
        User_BugReport_reportedByToUser: undefined,
        User_BugReport_testedByToUser: undefined,
        User_BugReport_resolvedByToUser: undefined,
      };

      logger.info(`Bug report ${id} updated by user ${user.id}`);

      return NextResponse.json(successResponse(transformedReport));
    } catch (error) {
      logger.error('Failed to update bug report:', error);
      return NextResponse.json(
        { error: 'Failed to update bug report' },
        { status: 500 }
      );
    }
  },
});

/**
 * DELETE /api/bug-reports/[id]
 * Delete a bug report (system admin only)
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BUG_REPORTS,
  handler: async (request, { user, params }) => {
    try {
      const resolvedParams = await params;
      const id = parseInt(resolvedParams.id as string, 10);

      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid bug report ID' },
          { status: 400 }
        );
      }

      // Fetch bug report with screenshot path
      const bugReport = await prisma.bugReport.findUnique({
        where: { id },
        select: { id: true, screenshotPath: true },
      });

      if (!bugReport) {
        return NextResponse.json(
          { error: 'Bug report not found' },
          { status: 404 }
        );
      }

      // Delete from database
      await prisma.bugReport.delete({
        where: { id },
      });

      // Delete screenshot from blob storage if exists
      if (bugReport.screenshotPath) {
        try {
          await deleteBugReportScreenshot(bugReport.screenshotPath);
        } catch (error) {
          // Log error but don't fail the request if blob deletion fails
          logger.warn(`Failed to delete screenshot for bug report ${id}:`, error);
        }
      }

      logger.info(`Bug report ${id} deleted by user ${user.id}`);

      return NextResponse.json(successResponse({ id, deleted: true }));
    } catch (error) {
      logger.error('Failed to delete bug report:', error);
      return NextResponse.json(
        { error: 'Failed to delete bug report' },
        { status: 500 }
      );
    }
  },
});
