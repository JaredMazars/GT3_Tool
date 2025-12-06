import { NextRequest, NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import {
  getTaxAdjustments,
  createTaxAdjustment,
  deleteAllTaxAdjustments,
} from '@/lib/tools/tax-calculation/api/adjustmentsHandler';

/**
 * GET /api/tasks/[id]/tax-adjustments
 * Fetch all tax adjustments for a project
 */
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
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const taskId = toTaskId(params?.id);
    
    // Check project access (any role can view)
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Get adjustments using tool handler
    const adjustments = await getTaxAdjustments(taskId, status);

    return NextResponse.json(successResponse(adjustments));
  } catch (error) {
    return handleApiError(error, 'Fetch Tax Adjustments');
  }
}

/**
 * POST /api/tasks/[id]/tax-adjustments
 * Create a new tax adjustment
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const taskId = toTaskId(params?.id);
    
    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();

    // Create adjustment using tool handler
    const adjustment = await createTaxAdjustment(taskId, body);

    return NextResponse.json(successResponse(adjustment), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Tax Adjustment');
  }
}

/**
 * DELETE /api/tasks/[id]/tax-adjustments
 * Delete all tax adjustments for a project (use with caution)
 */
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
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    const taskId = toTaskId(params?.id);
    
    // Check project access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Delete adjustments using tool handler
    const result = await deleteAllTaxAdjustments(taskId, status);

    return NextResponse.json(successResponse(result));
  } catch (error) {
    return handleApiError(error, 'Delete Tax Adjustments');
  }
}


