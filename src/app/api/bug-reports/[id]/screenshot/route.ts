import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { generateBugReportScreenshotSasUrl } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/bug-reports/[id]/screenshot
 * Get SAS URL for bug report screenshot (system admin only)
 */
export const GET = secureRoute.queryWithParams({
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

      // Fetch bug report
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

      if (!bugReport.screenshotPath) {
        return NextResponse.json(
          { error: 'No screenshot attached to this bug report' },
          { status: 404 }
        );
      }

      // Generate SAS URL
      const sasUrl = await generateBugReportScreenshotSasUrl(bugReport.screenshotPath);

      return NextResponse.json(successResponse({ url: sasUrl }));
    } catch (error) {
      logger.error('Failed to generate screenshot URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate screenshot URL' },
        { status: 500 }
      );
    }
  },
});
