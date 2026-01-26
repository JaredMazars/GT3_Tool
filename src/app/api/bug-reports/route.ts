import { NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { CreateBugReportSchema, BugReportFiltersSchema } from '@/lib/validation/schemas';
import { uploadBugReportScreenshot } from '@/lib/services/documents/blobStorage';
import { notifyAdminsOfBugReport } from '@/lib/services/notifications/bugReportNotifications';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/bug-reports
 * Submit a new bug report
 */
export const POST = secureRoute.fileUpload({
  handler: async (request, { user }) => {
    try {
      // Parse form data
      const formData = await request.formData();
      
      // Extract form data
      const url = formData.get('url') as string;
      const description = formData.get('description') as string;
      const screenshot = formData.get('screenshot') as File | null;

      // Validate required fields
      const validatedData = CreateBugReportSchema.parse({
        url,
        description,
      });

      // Upload screenshot if provided
      let screenshotPath: string | undefined;
      if (screenshot && screenshot.size > 0) {
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (screenshot.size > maxSize) {
          return NextResponse.json(
            { error: 'Screenshot file size must be less than 5MB' },
            { status: 400 }
          );
        }

        // Validate file type (images only)
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(screenshot.type)) {
          return NextResponse.json(
            { error: 'Screenshot must be an image file (PNG, JPG, GIF, or WEBP)' },
            { status: 400 }
          );
        }

        // Upload to blob storage
        const buffer = Buffer.from(await screenshot.arrayBuffer());
        screenshotPath = await uploadBugReportScreenshot(buffer, screenshot.name, user.id);
      }

      // Create bug report in database
      const bugReport = await prisma.bugReport.create({
        data: {
          reportedBy: user.id,
          url: validatedData.url,
          description: validatedData.description,
          screenshotPath,
          status: 'OPEN',
          priority: 'MEDIUM',
        },
        select: {
          id: true,
          reportedBy: true,
          reportedAt: true,
          url: true,
          description: true,
          screenshotPath: true,
          status: true,
          priority: true,
        },
      });

      // Send notification to SYSTEM_ADMIN users
      await notifyAdminsOfBugReport(bugReport);

      logger.info(`Bug report created: ${bugReport.id} by user ${user.id}`);

      return NextResponse.json(successResponse(bugReport));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      
      logger.error('Failed to create bug report:', error);
      return NextResponse.json(
        { error: 'Failed to create bug report' },
        { status: 500 }
      );
    }
  },
});

/**
 * GET /api/bug-reports
 * List all bug reports (system admin only)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BUG_REPORTS,
  handler: async (request, { user }) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse filters
      const status = searchParams.get('status') || undefined;
      const priority = searchParams.get('priority') || undefined;

      // Validate filters
      const filters = BugReportFiltersSchema.parse({ status, priority });

      // Build where clause
      const where: any = {};
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.priority) {
        where.priority = filters.priority;
      }

      // Fetch bug reports with reporter info
      const bugReports = await prisma.bugReport.findMany({
        where,
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
        orderBy: {
          reportedAt: 'desc',
        },
      });

      // Transform to include reporter, tester, resolver
      const transformedReports = bugReports.map((report) => ({
        ...report,
        reporter: report.User_BugReport_reportedByToUser,
        tester: report.User_BugReport_testedByToUser,
        resolver: report.User_BugReport_resolvedByToUser,
        User_BugReport_reportedByToUser: undefined,
        User_BugReport_testedByToUser: undefined,
        User_BugReport_resolvedByToUser: undefined,
      }));

      return NextResponse.json(successResponse(transformedReports));
    } catch (error) {
      logger.error('Failed to list bug reports:', error);
      return NextResponse.json(
        { error: 'Failed to list bug reports' },
        { status: 500 }
      );
    }
  },
});
