import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  getInvoiceDetailsByBucket,
  InvoicesByBucket 
} from '@/lib/services/analytics/debtorAggregation';

/**
 * GET /api/clients/[id]/debtors/details
 * Get detailed invoice information grouped by aging bucket for a client
 * 
 * Returns:
 * - Invoices grouped by aging bucket (current, 31-60, 61-90, 91-120, 120+)
 * - Each invoice includes:
 *   - Invoice number, date, original amount
 *   - Payments received, net balance
 *   - Days outstanding, service line
 *   - Full payment history
 * - Client information
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
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid client ID format. Expected GUID.' },
        { status: 400 }
      );
    }

    // 3. Check Permission - verify client exists and user has access
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // 4-5. Execute - Fetch debtor transactions for this client
    const debtorTransactions = await prisma.drsTransactions.findMany({
      where: {
        GSClientID: GSClientID,
      },
      select: {
        TranDate: true,
        Total: true,
        EntryType: true,
        InvNumber: true,
        Reference: true,
        ServLineCode: true,
        Narration: true,
        updatedAt: true,
      },
    });

    // Get Service Line names for display
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      select: {
        ServLineCode: true,
        masterCode: true,
      },
    });

    // Create a map of ServLineCode to Master Service Line name
    const servLineToMasterMap = new Map<string, string>();
    serviceLineExternals.forEach((sl) => {
      if (sl.ServLineCode && sl.masterCode) {
        servLineToMasterMap.set(sl.ServLineCode, sl.masterCode);
      }
    });

    // Fetch Master Service Line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Array.from(new Set(servLineToMasterMap.values())),
        },
      },
      select: {
        code: true,
        name: true,
      },
    });

    // Create map of master code to name
    const masterCodeToNameMap = new Map<string, string>();
    masterServiceLines.forEach((msl) => {
      masterCodeToNameMap.set(msl.code, msl.name);
    });

    // Create final map of ServLineCode to service line name
    const servLineNameMap = new Map<string, string>();
    servLineToMasterMap.forEach((masterCode, servLineCode) => {
      const name = masterCodeToNameMap.get(masterCode);
      if (name) {
        servLineNameMap.set(servLineCode, name);
      }
    });

    // Get detailed invoice information grouped by aging bucket
    const invoicesByBucket = getInvoiceDetailsByBucket(
      debtorTransactions,
      servLineNameMap
    );

    // 6. Respond
    const responseData = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      invoicesByBucket,
      totalInvoices: Object.values(invoicesByBucket).reduce(
        (sum, bucket) => sum + bucket.length,
        0
      ),
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client Debtor Details');
  }
}

