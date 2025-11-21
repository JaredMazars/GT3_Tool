import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateClientSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        Project: {
          where: { archived: false },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            projectType: true,
            serviceLine: true,
            taxYear: true,
            status: true,
            archived: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                MappedAccount: true,
                TaxAdjustment: true,
              },
            },
          },
        },
        _count: {
          select: {
            Project: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Transform Project to projects for frontend compatibility
    const { Project, ...clientWithoutProject } = client;
    const responseData = {
      ...clientWithoutProject,
      projects: Project.map(project => ({
        ...project,
        _count: {
          mappings: project._count.MappedAccount,
          taxAdjustments: project._count.TaxAdjustment,
        },
      })),
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateClientSchema.parse(body);

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check for duplicate client code if provided and different from current
    if (validatedData.clientCode && validatedData.clientCode !== existingClient.clientCode) {
      const duplicateClient = await prisma.client.findUnique({
        where: { clientCode: validatedData.clientCode },
      });

      if (duplicateClient) {
        return handleApiError(
          new AppError(400, `Client code '${validatedData.clientCode}' is already in use`, ErrorCodes.VALIDATION_ERROR),
          'Update Client'
        );
      }
    }

    // Update client
    const client = await prisma.client.update({
      where: { id: clientId },
      data: validatedData,
    });

    return NextResponse.json(successResponse(client));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Update Client'
      );
    }
    
    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const target = (error as any).meta?.target;
      if (target && target.includes('clientCode')) {
        return handleApiError(
          new AppError(400, 'Client code is already in use', ErrorCodes.VALIDATION_ERROR),
          'Update Client'
        );
      }
    }
    
    return handleApiError(error, 'Update Client');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        _count: {
          select: {
            Project: true,
          },
        },
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has projects
    if (existingClient._count.Project > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing projects. Please reassign or delete projects first.' },
        { status: 400 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { id: clientId },
    });

    return NextResponse.json(
      successResponse({ message: 'Client deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'Delete Client');
  }
}

