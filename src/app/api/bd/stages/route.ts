/**
 * BD Stages API Route
 * GET /api/bd/stages - List all active stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');

    const stages = await prisma.bDStage.findMany({
      where: {
        isActive: true,
        ...(serviceLine && { OR: [{ serviceLine }, { serviceLine: null }] }),
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(successResponse(stages));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/stages');
  }
}

