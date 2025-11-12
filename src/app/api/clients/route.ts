import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { createClientSchema } from '@/lib/utils/validation';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { clientCode: { contains: search } },
        { registrationNumber: { contains: search } },
        { taxNumber: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.client.count({ where });

    // Get clients with project count
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            Project: true,
          },
        },
      },
    });

    return NextResponse.json(
      successResponse({
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, 'Get Clients');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate request body
    const validatedData = createClientSchema.parse(body);

    // Check for duplicate client code if provided
    if (validatedData.clientCode) {
      const existingClient = await prisma.client.findUnique({
        where: { clientCode: validatedData.clientCode },
      });

      if (existingClient) {
        return handleApiError(
          new AppError(400, `Client code '${validatedData.clientCode}' is already in use`, ErrorCodes.VALIDATION_ERROR),
          'Create Client'
        );
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: validatedData,
    });

    return NextResponse.json(successResponse(client), { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Create Client'
      );
    }
    
    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const target = (error as any).meta?.target;
      if (target && target.includes('clientCode')) {
        return handleApiError(
          new AppError(400, 'Client code is already in use', ErrorCodes.VALIDATION_ERROR),
          'Create Client'
        );
      }
    }
    
    return handleApiError(error, 'Create Client');
  }
}

