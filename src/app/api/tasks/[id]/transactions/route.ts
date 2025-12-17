import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';

/**
 * GET /api/tasks/[id]/transactions
 * Get WIP transactions for a task with standard fields for transaction details modal
 * 
 * Returns:
 * - Task information
 * - Array of WIP transactions with standard fields
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse IDs
    const params = await context.params;
    const taskId = parseInt(params.id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }

    // 3. Check Feature - verify user has access to tasks
    const hasAccess = await checkFeature(user.id, Feature.ACCESS_TASKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Execute - verify task exists and get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        GSTaskID: true,
        TaskCode: true,
        TaskDesc: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 5. Execute - Get CARL partner employee codes to exclude their costs
    const carlPartners = await prisma.employee.findMany({
      where: {
        EmpCatCode: 'CARL',
      },
      select: {
        EmpCode: true,
      },
    });

    const carlPartnerCodes = new Set(carlPartners.map(emp => emp.EmpCode));

    // Fetch WIP transactions with standard fields
    const transactions = await prisma.wIPTransactions.findMany({
      where: {
        GSTaskID: task.GSTaskID,
      },
      select: {
        id: true,
        GSWIPTransID: true,
        TranDate: true,
        TranType: true,
        TType: true,
        EmpCode: true,
        EmpName: true,
        Amount: true,
        Cost: true,
        Hour: true,
        Ref: true,
        Narr: true,
        OfficeCode: true,
        TaskServLine: true,
      },
      orderBy: {
        TranDate: 'desc',
      },
    });

    // 6. Respond - Map transactions and zero out CARL partner costs
    const responseData = {
      taskId: task.id,
      taskCode: task.TaskCode,
      taskDesc: task.TaskDesc,
      transactions: transactions.map(txn => ({
        id: txn.id,
        GSWIPTransID: txn.GSWIPTransID,
        tranDate: txn.TranDate,
        tranType: txn.TranType,
        tType: txn.TType,
        empCode: txn.EmpCode,
        empName: txn.EmpName,
        amount: txn.Amount,
        cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
        hour: txn.Hour,
        ref: txn.Ref,
        narr: txn.Narr,
        officeCode: txn.OfficeCode,
        taskServLine: txn.TaskServLine,
      })),
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Task Transactions');
  }
}


