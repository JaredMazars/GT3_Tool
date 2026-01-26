/**
 * Example API: Fiscal Period Transaction Report
 * 
 * Demonstrates how to use fiscal period filtering with the new utilities.
 * This endpoint returns transactions filtered by fiscal year, quarter, or month.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { z } from 'zod';
import {
  buildFiscalPeriodFilter,
  getFiscalPeriods,
} from '@/lib/services/reports/fiscalPeriodQueries';

// Query parameter validation
const FiscalTransactionQuerySchema = z.object({
  fiscalYear: z.coerce.number().int().min(1999).max(2050).optional(),
  fiscalQuarter: z.coerce.number().int().min(1).max(4).optional(),
  fiscalMonth: z.coerce.number().int().min(1).max(12).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

/**
 * GET /api/reports/fiscal-transactions
 * 
 * Returns WIP transactions filtered by fiscal period
 * 
 * Query Parameters:
 * - fiscalYear: Filter by fiscal year (e.g., 2024)
 * - fiscalQuarter: Filter by quarter 1-4 (requires fiscalYear)
 * - fiscalMonth: Filter by fiscal month 1-12 (requires fiscalYear)
 * - limit: Max results to return (default: 100)
 * 
 * Examples:
 * - /api/reports/fiscal-transactions?fiscalYear=2024
 * - /api/reports/fiscal-transactions?fiscalYear=2024&fiscalQuarter=2
 * - /api/reports/fiscal-transactions?fiscalYear=2024&fiscalMonth=5
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const params = FiscalTransactionQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    
    const { fiscalYear, fiscalQuarter, fiscalMonth, limit } = params;
    
    // Build fiscal period filter
    const fiscalFilter = buildFiscalPeriodFilter(
      { fiscalYear, fiscalQuarter, fiscalMonth },
      'TranDate'
    );
    
    // Query transactions with fiscal period filter
    const transactions = await prisma.wIPTransactions.findMany({
      where: {
        ...fiscalFilter,
      },
      select: {
        id: true,
        TranDate: true,
        ClientCode: true,
        ClientName: true,
        TaskCode: true,
        TaskDesc: true,
        TranType: true,
        Amount: true,
        Hour: true,
        EmpName: true,
        TaskServLine: true,
        TaskServLineDesc: true,
      },
      orderBy: {
        TranDate: 'desc',
      },
      take: limit,
    });
    
    // Get fiscal period metadata for display
    let periodInfo = null;
    if (fiscalYear) {
      const groupBy = fiscalMonth
        ? 'month'
        : fiscalQuarter
        ? 'quarter'
        : 'year';
      
      const periods = await getFiscalPeriods({
        fiscalYear,
        fiscalQuarter,
        groupBy,
      });
      
      periodInfo = periods[0] || null;
    }
    
    // Calculate summary statistics
    const summary = transactions.reduce(
      (acc, t) => {
        const amount = t.Amount || 0;
        const hours = t.Hour || 0;
        
        acc.totalAmount += amount;
        acc.totalHours += hours;
        acc.transactionCount += 1;
        
        return acc;
      },
      {
        totalAmount: 0,
        totalHours: 0,
        transactionCount: 0,
      }
    );
    
    return NextResponse.json(
      successResponse({
        filter: {
          fiscalYear,
          fiscalQuarter,
          fiscalMonth,
          periodLabel: periodInfo?.label,
        },
        summary,
        transactions,
        metadata: {
          count: transactions.length,
          limit,
          hasMore: transactions.length === limit,
        },
      })
    );
  },
});

/**
 * Example: Additional endpoint for getting available fiscal periods
 * 
 * To add this functionality, create a separate route:
 * src/app/api/reports/fiscal-periods/route.ts
 * 
 * export const GET = secureRoute.query({
 *   feature: Feature.ACCESS_TASKS,
 *   handler: async (request) => {
 *     const { searchParams } = new URL(request.url);
 *     const fiscalYear = searchParams.get('fiscalYear')
 *       ? parseInt(searchParams.get('fiscalYear')!)
 *       : undefined;
 *     const groupBy = (searchParams.get('groupBy') || 'year') as 'year' | 'quarter' | 'month';
 *     
 *     const periods = await getFiscalPeriods({ fiscalYear, groupBy, orderBy: 'desc' });
 *     return NextResponse.json(successResponse({ periods }));
 *   },
 * });
 */

