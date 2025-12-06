import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';

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
 * GET /api/groups/[groupCode]/wip
 * Get aggregated Work in Progress and Profitability data for a group
 * 
 * Returns:
 * - Overall profitability metrics for all clients in the group
 * - Profitability metrics grouped by Master Service Line
 * - Master Service Line information
 * - Task count contributing to WIP
 * - Latest update timestamp
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupCode: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse IDs
    const { groupCode } = params;

    if (!groupCode) {
      return NextResponse.json(
        { error: 'Group code is required' },
        { status: 400 }
      );
    }

    // 3. Check Permission
    const { checkUserPermission } = await import('@/lib/services/permissions/permissionService');
    const hasPermission = await checkUserPermission(user.id, 'clients', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // 4. Filter Service Lines - get user's accessible service lines
    const userServiceLines = await getUserServiceLines(user.id);
    const accessibleMasterCodes = userServiceLines.map(sl => sl.serviceLine);

    // Map master codes to actual ServLineCodes from ServiceLineExternal
    const servLineCodesPromises = accessibleMasterCodes.map(masterCode =>
      getExternalServiceLinesByMaster(masterCode)
    );
    const servLineCodesArrays = await Promise.all(servLineCodesPromises);
    
    // Flatten and extract ServLineCodes
    const accessibleServLineCodes = Array.from(
      new Set(
        servLineCodesArrays
          .flat()
          .map(sl => sl.ServLineCode)
          .filter((code): code is string => code !== null)
      )
    );

    if (accessibleServLineCodes.length === 0) {
      return NextResponse.json(
        successResponse({
          groupCode,
          groupDesc: '',
          overall: calculateProfitabilityMetrics({
            ltdTime: 0,
            ltdAdjTime: 0,
            ltdAdjDisb: 0,
            ltdCost: 0,
            balWIP: 0,
            balTime: 0,
            balDisb: 0,
            wipProvision: 0,
            ltdDisb: 0,
            ltdFeeTime: 0,
            ltdFeeDisb: 0,
            ltdHours: 0,
            taskCount: 0,
          }),
          byMasterServiceLine: {},
          masterServiceLines: [],
          taskCount: 0,
          lastUpdated: null,
        })
      );
    }

    // 5. Execute - Verify the group exists
    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: {
        groupCode: true,
        groupDesc: true,
      },
    });

    if (!groupInfo) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get all clients in this group
    const clientsInGroup = await prisma.client.findMany({
      where: {
        groupCode,
        Task: {
          some: {
            ServLineCode: { in: accessibleServLineCodes },
          },
        },
      },
      select: {
        ClientID: true,
      },
    });

    const clientIDs = clientsInGroup.map(c => c.ClientID);

    if (clientIDs.length === 0) {
      return NextResponse.json(
        successResponse({
          groupCode: groupInfo.groupCode,
          groupDesc: groupInfo.groupDesc,
          overall: calculateProfitabilityMetrics({
            ltdTime: 0,
            ltdAdjTime: 0,
            ltdAdjDisb: 0,
            ltdCost: 0,
            balWIP: 0,
            balTime: 0,
            balDisb: 0,
            wipProvision: 0,
            ltdDisb: 0,
            ltdFeeTime: 0,
            ltdFeeDisb: 0,
            ltdHours: 0,
            taskCount: 0,
          }),
          byMasterServiceLine: {},
          masterServiceLines: [],
          taskCount: 0,
          lastUpdated: null,
        })
      );
    }

    // Fetch WIP data for all clients in the group
    const wipRecords = await prisma.wipLTD.findMany({
      where: {
        ClientCode: {
          in: clientIDs,
        },
      },
      select: {
        ServLineCode: true,
        BalWIP: true,
        BalTime: true,
        BalDisb: true,
        WipProvision: true,
        LTDTime: true,
        LTDDisb: true,
        LTDAdjTime: true,
        LTDAdjDisb: true,
        LTDCostExcludeCP: true,
        LTDFeeTime: true,
        LTDFeeDisb: true,
        LTDHours: true,
        updatedAt: true,
      },
    });

    // Filter WIP records by accessible service lines
    const filteredWipRecords = wipRecords.filter(record => 
      record.ServLineCode && accessibleServLineCodes.includes(record.ServLineCode)
    );

    // Get Service Line External mappings to Master Service Lines
    const serviceLineExternals = await prisma.serviceLineExternal.findMany({
      where: {
        ServLineCode: {
          in: accessibleServLineCodes,
        },
      },
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

    // Group WIP data by Master Service Line
    const groupedData = new Map<string, {
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
    }>();

    // Initialize overall totals
    const overallTotals = {
      ltdTime: 0,
      ltdAdjTime: 0,
      ltdAdjDisb: 0,
      ltdCost: 0,
      balWIP: 0,
      balTime: 0,
      balDisb: 0,
      wipProvision: 0,
      ltdDisb: 0,
      ltdFeeTime: 0,
      ltdFeeDisb: 0,
      ltdHours: 0,
      taskCount: 0,
    };

    // Aggregate by Master Service Line
    filteredWipRecords.forEach((record) => {
      const masterCode = servLineToMasterMap.get(record.ServLineCode || '') || 'UNKNOWN';
      
      if (!groupedData.has(masterCode)) {
        groupedData.set(masterCode, {
          ltdTime: 0,
          ltdAdjTime: 0,
          ltdAdjDisb: 0,
          ltdCost: 0,
          balWIP: 0,
          balTime: 0,
          balDisb: 0,
          wipProvision: 0,
          ltdDisb: 0,
          ltdFeeTime: 0,
          ltdFeeDisb: 0,
          ltdHours: 0,
          taskCount: 0,
        });
      }

      const group = groupedData.get(masterCode)!;
      group.ltdTime += record.LTDTime || 0;
      group.ltdAdjTime += record.LTDAdjTime || 0;
      group.ltdAdjDisb += record.LTDAdjDisb || 0;
      group.ltdCost += record.LTDCostExcludeCP || 0;
      group.balWIP += record.BalWIP || 0;
      group.balTime += record.BalTime || 0;
      group.balDisb += record.BalDisb || 0;
      group.wipProvision += record.WipProvision || 0;
      group.ltdDisb += record.LTDDisb || 0;
      group.ltdFeeTime += record.LTDFeeTime || 0;
      group.ltdFeeDisb += record.LTDFeeDisb || 0;
      group.ltdHours += record.LTDHours || 0;
      group.taskCount += 1;

      // Aggregate to overall
      overallTotals.ltdTime += record.LTDTime || 0;
      overallTotals.ltdAdjTime += record.LTDAdjTime || 0;
      overallTotals.ltdAdjDisb += record.LTDAdjDisb || 0;
      overallTotals.ltdCost += record.LTDCostExcludeCP || 0;
      overallTotals.balWIP += record.BalWIP || 0;
      overallTotals.balTime += record.BalTime || 0;
      overallTotals.balDisb += record.BalDisb || 0;
      overallTotals.wipProvision += record.WipProvision || 0;
      overallTotals.ltdDisb += record.LTDDisb || 0;
      overallTotals.ltdFeeTime += record.LTDFeeTime || 0;
      overallTotals.ltdFeeDisb += record.LTDFeeDisb || 0;
      overallTotals.ltdHours += record.LTDHours || 0;
      overallTotals.taskCount += 1;
    });

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

    // Get the latest update timestamp
    const latestWip = filteredWipRecords.length > 0
      ? filteredWipRecords.reduce((latest, current) => 
          (current.updatedAt > latest.updatedAt) ? current : latest
        )
      : null;

    // 6. Respond
    const responseData = {
      groupCode: groupInfo.groupCode,
      groupDesc: groupInfo.groupDesc,
      overall,
      byMasterServiceLine,
      masterServiceLines: masterServiceLines.map(msl => ({
        code: msl.code,
        name: msl.name,
      })),
      taskCount: overallTotals.taskCount,
      lastUpdated: latestWip?.updatedAt || null,
    };

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Group WIP');
  }
}

