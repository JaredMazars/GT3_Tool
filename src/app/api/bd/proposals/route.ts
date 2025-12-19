/**
 * BD Proposals API Routes
 * GET /api/bd/proposals - List proposals
 * POST /api/bd/proposals - Create new proposal
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateBDProposalSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/bd/proposals
 * List proposals with filtering
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId')
      ? Number.parseInt(searchParams.get('opportunityId')!)
      : undefined;
    const status = searchParams.get('status') || undefined;
    const page = Number.parseInt(searchParams.get('page') || '1');
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20');

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
          BDOpportunity: {
            select: { id: true, title: true, companyName: true },
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
  },
});

/**
 * POST /api/bd/proposals
 * Create new proposal
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_BD,
  schema: CreateBDProposalSchema,
  handler: async (request, { user, data }) => {
    // File metadata is expected in the body
    const body = await request.json();
    
    if (!body.fileName || !body.filePath || !body.fileSize) {
      return NextResponse.json(
        { success: false, error: 'File upload data required (fileName, filePath, fileSize)' },
        { status: 400 }
      );
    }

    const proposal = await prisma.bDProposal.create({
      data: {
        ...data,
        fileName: body.fileName,
        filePath: body.filePath,
        fileSize: body.fileSize,
        uploadedBy: user.id,
        updatedAt: new Date(),
      },
      include: {
        BDOpportunity: {
          select: { id: true, title: true, companyName: true },
        },
      },
    });

    return NextResponse.json(successResponse(proposal), { status: 201 });
  },
});
