import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
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
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    // Parse and validate GSClientID
    const GSClientID = parseGSClientID(params.id);

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
      },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch debtor transactions and service line mappings in parallel
    const [debtorTransactions, serviceLineExternals] = await Promise.all([
      prisma.drsTransactions.findMany({
        where: { GSClientID },
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
      }),
      prisma.serviceLineExternal.findMany({
        select: {
          ServLineCode: true,
          masterCode: true,
        },
        take: 1000,
      }),
    ]);

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
      take: 100,
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
  },
});

