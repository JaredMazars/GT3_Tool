/**
 * BD Contact by ID API Routes
 * GET /api/bd/contacts/[id] - Get contact details
 * PUT /api/bd/contacts/[id] - Update contact
 * DELETE /api/bd/contacts/[id] - Delete contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateBDContactSchema } from '@/lib/validation/schemas';
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
    const contactId = parseInt(id);

    const contact = await prisma.bDContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(contact));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/contacts/[id]');
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
    const contactId = parseInt(id);

    const body = await request.json();
    const validated = UpdateBDContactSchema.parse(body);

    const contact = await prisma.bDContact.update({
      where: { id: contactId },
      data: validated,
    });

    return NextResponse.json(successResponse(contact));
  } catch (error) {
    return handleApiError(error, 'PUT /api/bd/contacts/[id]');
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
    const contactId = parseInt(id);

    await prisma.bDContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/bd/contacts/[id]');
  }
}

