import { NextRequest, NextResponse } from 'next/server';
import { generateReportingPackPDF } from '@/lib/services/export/serverPdfExporter';
import { getSession } from '@/lib/services/auth/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { reportData, selectedReports } = body;

        if (!reportData || !selectedReports) {
            return NextResponse.json(
                { error: 'Missing report data or selection' },
                { status: 400 }
            );
        }

        const pdfBlob = await generateReportingPackPDF(reportData, selectedReports);
        const buffer = Buffer.from(await pdfBlob.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${reportData.projectName}-reporting-pack.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
