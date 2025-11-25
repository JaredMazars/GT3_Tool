import { NextRequest, NextResponse } from 'next/server';
import { generateReportingPackPDF } from '@/lib/services/export/serverPdfExporter';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { toProjectId } from '@/types/branded';
import { handleApiError } from '@/lib/utils/errorHandler';
import { z } from 'zod';

const ExportReportSchema = z.object({
  reportData: z.object({
    projectName: z.string(),
  }).passthrough(),
  selectedReports: z.array(z.string()),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const projectId = toProjectId(params.id);

        // Check project access
        const hasAccess = await checkProjectAccess(user.id, projectId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validated = ExportReportSchema.parse(body);

        const pdfBlob = await generateReportingPackPDF(validated.reportData, validated.selectedReports);
        const buffer = Buffer.from(await pdfBlob.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${validated.reportData.projectName}-reporting-pack.pdf"`,
            },
        });
    } catch (error) {
        return handleApiError(error, 'POST /api/projects/[id]/reporting/export');
    }
}
