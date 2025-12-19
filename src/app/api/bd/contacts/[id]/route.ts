/**
 * BD Contact by ID API Routes
 * GET /api/bd/contacts/[id] - Get contact details
 * PUT /api/bd/contacts/[id] - Update contact
 * DELETE /api/bd/contacts/[id] - Delete contact
 */

import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateBDContactSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

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
 * GET /api/bd/contacts/[id]
 * Get contact details
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const contactId = parseNumericId(params.id, 'Contact');

    const contact = await prisma.bDContact.findUnique({
      where: { id: contactId },
      select: contactSelectFields,
    });

    if (!contact) {
      throw new AppError(404, 'Contact not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(contact));
  },
});

/**
 * PUT /api/bd/contacts/[id]
 * Update contact
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  schema: UpdateBDContactSchema,
  handler: async (request, { user, params, data }) => {
    const contactId = parseNumericId(params.id, 'Contact');

    // Verify contact exists
    const existing = await prisma.bDContact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Contact not found', ErrorCodes.NOT_FOUND);
    }

    const contact = await prisma.bDContact.update({
      where: { id: contactId },
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
        updatedAt: new Date(),
      },
      select: contactSelectFields,
    });

    return NextResponse.json(successResponse(contact));
  },
});

/**
 * DELETE /api/bd/contacts/[id]
 * Delete contact
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const contactId = parseNumericId(params.id, 'Contact');

    // Verify contact exists
    const existing = await prisma.bDContact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Contact not found', ErrorCodes.NOT_FOUND);
    }

    await prisma.bDContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
