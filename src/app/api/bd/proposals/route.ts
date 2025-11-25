/**
 * BD Proposals API Routes
 * GET /api/bd/proposals - List proposals
 * POST /api/bd/proposals - Create new proposal (with file upload)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateBDProposalSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId')
      ? parseInt(searchParams.get('opportunityId')!)
      : undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    interface WhereClause {
      opportunityId?: number;
      status?: string;
    }

    const where: WhereClause = {};
    if (opportunityId) where.opportunityId = opportunityId;
    if (status) where.status = status;

    const [proposals, total] = await Promise.all([
      prisma.bDProposal.findMany({
        where,
        include: {
          Opportunity: {
            select: {
              id: true,
              title: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bDProposal.count({ where }),
    ]);

    return NextResponse.json(
      successResponse({
        proposals,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/proposals');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: File upload handling would be implemented here
    // For now, we'll accept file metadata in JSON body
    const body = await request.json();
    const validated = CreateBDProposalSchema.parse(body);

    // In a real implementation, file upload would be handled here
    // For this implementation, we'll require fileName and filePath to be provided
    if (!body.fileName || !body.filePath || !body.fileSize) {
      return NextResponse.json(
        { error: 'File upload data required (fileName, filePath, fileSize)' },
        { status: 400 }
      );
    }

    const proposal = await prisma.bDProposal.create({
      data: {
        ...validated,
        fileName: body.fileName,
        filePath: body.filePath,
        fileSize: body.fileSize,
        uploadedBy: user.id,
      },
      include: {
        Opportunity: {
          select: {
            id: true,
            title: true,
            companyName: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(proposal), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/bd/proposals');
  }
}

