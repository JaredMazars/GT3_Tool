/**
 * BD Proposal by ID API Routes
 * GET /api/bd/proposals/[id] - Get proposal details
 * PUT /api/bd/proposals/[id] - Update proposal
 * DELETE /api/bd/proposals/[id] - Delete proposal
 */

import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateBDProposalSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

/**
 * Common select fields for proposal queries
 */
const proposalSelectFields = {
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
    select: {
      id: true,
      title: true,
      companyName: true,
    },
  },
} as const;

/**
 * GET /api/bd/proposals/[id]
 * Get proposal details
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const proposalId = parseNumericId(params.id, 'Proposal');

    const proposal = await prisma.bDProposal.findUnique({
      where: { id: proposalId },
      select: proposalSelectFields,
    });

    if (!proposal) {
      throw new AppError(404, 'Proposal not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(proposal));
  },
});

/**
 * PUT /api/bd/proposals/[id]
 * Update proposal
 */
export const PUT = secureRoute.mutationWithParams<
  typeof UpdateBDProposalSchema,
  { id: string }
>({
  feature: Feature.ACCESS_BD,
  schema: UpdateBDProposalSchema,
  handler: async (request, { user, params, data }) => {
    const proposalId = parseNumericId(params.id, 'Proposal');

    // Check existence before update
    const existing = await prisma.bDProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Proposal not found', ErrorCodes.NOT_FOUND);
    }

    const proposal = await prisma.bDProposal.update({
      where: { id: proposalId },
      data: {
        title: data.title,
        description: data.description,
        proposedValue: data.proposedValue,
        validUntil: data.validUntil,
        status: data.status,
        sentAt: data.sentAt,
        viewedAt: data.viewedAt,
        respondedAt: data.respondedAt,
        updatedAt: new Date(),
      },
      select: proposalSelectFields,
    });

    return NextResponse.json(successResponse(proposal));
  },
});

/**
 * DELETE /api/bd/proposals/[id]
 * Delete proposal
 */
export const DELETE = secureRoute.mutationWithParams<never, { id: string }>({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const proposalId = parseNumericId(params.id, 'Proposal');

    // Check existence before delete
    const existing = await prisma.bDProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Proposal not found', ErrorCodes.NOT_FOUND);
    }

    await prisma.bDProposal.delete({
      where: { id: proposalId },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  },
});

