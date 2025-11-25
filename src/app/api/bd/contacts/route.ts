/**
 * BD Contacts API Routes
 * GET /api/bd/contacts - List contacts
 * POST /api/bd/contacts - Create new contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateBDContactSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where = search
      ? {
          OR: [
            { companyName: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [contacts, total] = await Promise.all([
      prisma.bDContact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bDContact.count({ where }),
    ]);

    return NextResponse.json(
      successResponse({
        contacts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/contacts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateBDContactSchema.parse(body);

    const contact = await prisma.bDContact.create({
      data: {
        ...validated,
        createdBy: user.id,
      },
    });

    return NextResponse.json(successResponse(contact), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/bd/contacts');
  }
}

