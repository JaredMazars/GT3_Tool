import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/admin/sub-service-line-groups
 * List all SubServiceLineGroups grouped by Master Service Line
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { user }) => {
    // Get all distinct SubServiceLineGroups with their master service line
    const subServiceLineGroups = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: { not: null },
        masterCode: { not: null },
      },
      select: {
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true,
        masterCode: true,
      },
      distinct: ['SubServlineGroupCode'],
      orderBy: [
        { masterCode: 'asc' },
        { SubServlineGroupCode: 'asc' },
      ],
    });

    // Group by master service line
    const grouped = subServiceLineGroups.reduce((acc, item) => {
      if (!item.SubServlineGroupCode || !item.masterCode) return acc;

      if (!acc[item.masterCode]) {
        acc[item.masterCode] = [];
      }

      acc[item.masterCode]!.push({
        code: item.SubServlineGroupCode,
        description: item.SubServlineGroupDesc || item.SubServlineGroupCode,
      });

      return acc;
    }, {} as Record<string, Array<{ code: string; description: string }>>);

    // Get master service line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: { code: { in: Object.keys(grouped) } },
      select: { code: true, name: true, description: true },
    });

    const masterServiceLineMap = masterServiceLines.reduce((acc, master) => {
      acc[master.code] = { name: master.name, description: master.description };
      return acc;
    }, {} as Record<string, { name: string; description: string | null }>);

    // Format response
    const response = Object.entries(grouped).map(([masterCode, groups]) => ({
      masterCode,
      masterName: masterServiceLineMap[masterCode]?.name || masterCode,
      masterDescription: masterServiceLineMap[masterCode]?.description || null,
      groups: groups.sort((a, b) => a.code.localeCompare(b.code)),
    }));

    return NextResponse.json(successResponse(response));
  },
});
