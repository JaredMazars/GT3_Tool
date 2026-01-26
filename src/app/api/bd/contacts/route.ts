/**
 * BD Contacts API Routes
 * GET /api/bd/contacts - List contacts
 * POST /api/bd/contacts - Create new contact
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateBDContactSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';

const ContactsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
}).strict();

const contactSelectFields = {
  id: true,
  companyName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  mobile: true,
  jobTitle: true,
  linkedin: true,
  industry: true,
  sector: true,
  website: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/bd/contacts
 * List contacts with search and pagination
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    const { search, page, pageSize } = ContactsQuerySchema.parse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

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
        select: contactSelectFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        jobTitle: data.jobTitle,
        linkedin: data.linkedin,
        industry: data.industry,
        sector: data.sector,
        website: data.website,
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: data.country,
        notes: data.notes,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      select: contactSelectFields,
    });

    return NextResponse.json(successResponse(contact), { status: 201 });
  },
});
