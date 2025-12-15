import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { 
  aggregateWipTransactionsByServiceLine, 
  aggregateOverallWipData,
  countUniqueTasks 
} from '@/lib/services/analytics/wipAggregation';

interface ProfitabilityMetrics {
  grossProduction: number;
  ltdAdjustment: number;
  netRevenue: number;
  adjustmentPercentage: number;
  ltdCost: number;
  grossProfit: number;
  grossProfitPercentage: number;
  averageChargeoutRate: number;
  averageRecoveryRate: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdTime: number;
  ltdDisb: number;
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
  ltdHours: number;
  taskCount: number;
}

interface MasterServiceLineInfo {
  code: string;
  name: string;
}

/**
 * Calculate profitability metrics from raw WIP data
 */
function calculateProfitabilityMetrics(data: {
  ltdTime: number;
  ltdAdjTime: number;
  ltdAdjDisb: number;
  ltdCost: number;
  balWIP: number;
  balTime: number;
  balDisb: number;
  wipProvision: number;
  ltdDisb: number;
  ltdFeeTime: number;
  ltdFeeDisb: number;
  ltdHours: number;
  taskCount: number;
}): ProfitabilityMetrics {
  const grossProduction = data.ltdTime;
  const ltdAdjustment = data.ltdAdjTime + data.ltdAdjDisb;
  const netRevenue = grossProduction + ltdAdjustment;
  const adjustmentPercentage = grossProduction !== 0 ? (ltdAdjustment / grossProduction) * 100 : 0;
  const grossProfit = netRevenue - data.ltdCost;
  const grossProfitPercentage = netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : 0;
  const averageChargeoutRate = data.ltdHours !== 0 ? grossProduction / data.ltdHours : 0;
  const averageRecoveryRate = data.ltdHours !== 0 ? netRevenue / data.ltdHours : 0;

  return {
    grossProduction,
    ltdAdjustment,
    netRevenue,
    adjustmentPercentage,
    ltdCost: data.ltdCost,
    grossProfit,
    grossProfitPercentage,
    averageChargeoutRate,
    averageRecoveryRate,
    balWIP: data.balWIP,
    balTime: data.balTime,
    balDisb: data.balDisb,
    wipProvision: data.wipProvision,
    ltdTime: data.ltdTime,
    ltdDisb: data.ltdDisb,
    ltdAdjTime: data.ltdAdjTime,
    ltdAdjDisb: data.ltdAdjDisb,
    ltdFeeTime: data.ltdFeeTime,
    ltdFeeDisb: data.ltdFeeDisb,
    ltdHours: data.ltdHours,
    taskCount: data.taskCount,
  };
}

/**
 * GET /api/clients/[id]/wip
 * Get aggregated Work in Progress and Profitability data for a client
 * 
 * Returns:
 * - Overall profitability metrics
 * - Profitability metrics grouped by Master Service Line
 * - Master Service Line information
 * - Task count contributing to WIP
 * - Latest update timestamp
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

    // 4-5. Execute - First, get CARL partner employee codes
    const carlPartners = await prisma.employee.findMany({
      where: {
        EmpCatCode: 'CARL',
      },
      select: {
        EmpCode: true,
      },
    });

    const carlPartnerCodes = new Set(carlPartners.map(emp => emp.EmpCode));

    // Fetch ALL WIP transactions for this client (including Carl Partners)
    const wipTransactions = await prisma.wIPTransactions.findMany({
      where: {
        GSClientID: GSClientID,
      },
      select: {
        GSTaskID: true,
        TaskServLine: true,
        Amount: true,
        Cost: true,
        Hour: true,
        TType: true,
        EmpCode: true,
        updatedAt: true,
      },
    });

    // Set cost to 0 for Carl Partner transactions
    const processedTransactions = wipTransactions.map(txn => ({
      ...txn,
      Cost: txn.EmpCode && carlPartnerCodes.has(txn.EmpCode) ? 0 : txn.Cost,
    }));

    // Get Service Line External mappings to Master Service Lines
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      select: {
        ServLineCode: true,
        masterCode: true,
      },
    });

    // Create a map of ServLineCode to masterCode
    const servLineToMasterMap = new Map<string, string>();
    serviceLineExternals.forEach((sl) => {
      if (sl.ServLineCode && sl.masterCode) {
        servLineToMasterMap.set(sl.ServLineCode, sl.masterCode);
      }
    });

    // Aggregate WIP transactions by Master Service Line using processed transactions
    const groupedData = aggregateWipTransactionsByServiceLine(
      processedTransactions,
      servLineToMasterMap
    );

    // Calculate overall totals using processed transactions
    const overallTotals = aggregateOverallWipData(processedTransactions);
    
    // Count unique tasks
    const taskCount = countUniqueTasks(processedTransactions);
    overallTotals.taskCount = taskCount;

    // Fetch Master Service Line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Array.from(groupedData.keys()).filter(code => code !== 'UNKNOWN'),
        },
      },
      select: {
        code: true,
        name: true,
      },
    });

    // Calculate profitability metrics for each Master Service Line
    const byMasterServiceLine: Record<string, ProfitabilityMetrics> = {};
    groupedData.forEach((data, masterCode) => {
      byMasterServiceLine[masterCode] = calculateProfitabilityMetrics(data);
    });

    // Calculate overall profitability metrics
    const overall = calculateProfitabilityMetrics(overallTotals);

    // Get the latest update timestamp from transactions
    const latestWipTransaction = wipTransactions.length > 0
      ? wipTransactions.reduce((latest, current) =>
          current.updatedAt > latest.updatedAt ? current : latest
        )
      : null;

    // 6. Respond
    const responseData = {
      GSClientID: client.GSClientID,
      clientCode: client.clientCode,
      clientName: client.clientNameFull,
      overall,
      byMasterServiceLine,
      masterServiceLines: masterServiceLines.map(msl => ({
        code: msl.code,
        name: msl.name,
      })),
      taskCount: taskCount,
      lastUpdated: latestWipTransaction?.updatedAt || null,
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client WIP');
  }
}


