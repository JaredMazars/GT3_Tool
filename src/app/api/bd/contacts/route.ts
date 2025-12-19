/**
 * BD Contacts API Routes
 * GET /api/bd/contacts - List contacts
 * POST /api/bd/contacts - Create new contact
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateBDContactSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/bd/contacts
 * List contacts with search and pagination
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = Number.parseInt(searchParams.get('page') || '1');
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20');

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
  },
});

/**
 * POST /api/bd/contacts
 * Create new contact
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_BD,
  schema: CreateBDContactSchema,
  handler: async (request, { user, data }) => {
    const contact = await prisma.bDContact.create({
      data: {
        ...data,
        createdBy: user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(successResponse(contact), { status: 201 });
  },
});
