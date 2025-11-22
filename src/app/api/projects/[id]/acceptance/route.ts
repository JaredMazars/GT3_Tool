import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';

/**
 * POST /api/projects/[id]/acceptance
 * Approve client acceptance and continuance for a project
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    // Check if user has ADMIN role on this project
    const projectUser = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (!projectUser || projectUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only project admins can approve client acceptance' },
        { status: 403 }
      );
    }

    // Check if this is a client project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { clientId: true, acceptanceApproved: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.clientId) {
      return NextResponse.json(
        { error: 'Client acceptance is only required for client projects' },
        { status: 400 }
      );
    }

    if (project.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance already approved' },
        { status: 400 }
      );
    }

    // Approve the acceptance
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        acceptanceApproved: true,
        acceptanceApprovedBy: user.id,
        acceptanceApprovedAt: new Date(),
      },
      include: {
        client: true,
        ProjectUser: {
          include: {
            User: true,
          },
        },
        _count: {
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
      },
    });

    return NextResponse.json(
      successResponse({
        ...updatedProject,
        _count: {
          mappings: updatedProject._count.MappedAccount,
          taxAdjustments: updatedProject._count.TaxAdjustment,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/acceptance');
  }
}


