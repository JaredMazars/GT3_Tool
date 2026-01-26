/**
 * BD Proposals API Routes
 * GET /api/bd/proposals - List proposals
 * POST /api/bd/proposals - Create new proposal
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateBDProposalSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';

/**
 * Query params schema for listing proposals
 */
const ProposalListQuerySchema = z.object({
  opportunityId: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

/**
 * Extended create schema that includes file metadata
 */
const CreateProposalWithFileSchema = CreateBDProposalSchema.extend({
  fileName: z.string().min(1).max(500),
  filePath: z.string().min(1).max(1000),
  fileSize: z.number().int().min(0),
}).strict();

/**
 * GET /api/bd/proposals
 * List proposals with filtering
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryResult = ProposalListQuerySchema.safeParse({
      opportunityId: searchParams.get('opportunityId') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, {
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    const { opportunityId, status, page, pageSize } = queryResult.data;

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
        select: {
          id: true,
          opportunityId: true,
          title: true,
          description: true,
          proposedValue: true,
          validUntil: true,
          status: true,
          version: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          uploadedBy: true,
          sentAt: true,
          viewedAt: true,
          respondedAt: true,
          createdAt: true,
          updatedAt: true,
          BDOpportunity: {
            select: { id: true, title: true, companyName: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
  schema: CreateProposalWithFileSchema,
  handler: async (request, { user, data }) => {
    // Verify opportunity exists
    const opportunity = await prisma.bDOpportunity.findUnique({
      where: { id: data.opportunityId },
      select: { id: true },
    });

    if (!opportunity) {
      throw new AppError(404, 'Opportunity not found', ErrorCodes.NOT_FOUND);
    }

    const proposal = await prisma.bDProposal.create({
      data: {
        opportunityId: data.opportunityId,
        title: data.title,
        description: data.description,
        proposedValue: data.proposedValue,
        validUntil: data.validUntil,
        version: data.version,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        uploadedBy: user.id,
        status: 'DRAFT',
        updatedAt: new Date(),
      },
      select: {
        id: true,
        opportunityId: true,
        title: true,
        description: true,
        proposedValue: true,
        validUntil: true,
        status: true,
        version: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        uploadedBy: true,
        createdAt: true,
        updatedAt: true,
        BDOpportunity: {
          select: { id: true, title: true, companyName: true },
        },
      },
    });

    return NextResponse.json(successResponse(proposal), { status: 201 });
  },
});
