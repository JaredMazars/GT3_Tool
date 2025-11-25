/**
 * BD Proposal by ID API Routes
 * GET /api/bd/proposals/[id] - Get proposal details
 * PUT /api/bd/proposals/[id] - Update proposal
 * DELETE /api/bd/proposals/[id] - Delete proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateBDProposalSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const proposalId = parseInt(id);

    const proposal = await prisma.bDProposal.findUnique({
      where: { id: proposalId },
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

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(proposal));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/proposals/[id]');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const proposalId = parseInt(id);

    const body = await request.json();
    const validated = UpdateBDProposalSchema.parse(body);

    const proposal = await prisma.bDProposal.update({
      where: { id: proposalId },
      data: validated,
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

    return NextResponse.json(successResponse(proposal));
  } catch (error) {
    return handleApiError(error, 'PUT /api/bd/proposals/[id]');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const proposalId = parseInt(id);

    await prisma.bDProposal.delete({
      where: { id: proposalId },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/bd/proposals/[id]');
  }
}

