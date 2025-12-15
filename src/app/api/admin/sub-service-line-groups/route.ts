import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/sub-service-line-groups
 * List all SubServiceLineGroups grouped by Master Service Line
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get all distinct SubServiceLineGroups with their master service line
    const subServiceLineGroups = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: {
          not: null,
        },
        masterCode: {
          not: null,
        },
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

    // 4. Group by master service line
    const grouped = subServiceLineGroups.reduce((acc, item) => {
      if (!item.SubServlineGroupCode || !item.masterCode) return acc;

      if (!acc[item.masterCode]) {
        acc[item.masterCode] = [];
      }

      acc[item.masterCode].push({
        code: item.SubServlineGroupCode,
        description: item.SubServlineGroupDesc || item.SubServlineGroupCode,
      });

      return acc;
    }, {} as Record<string, Array<{ code: string; description: string }>>);

    // 5. Get master service line names
    const masterServiceLines = await prisma.serviceLineMaster.findMany({
      where: {
        code: {
          in: Object.keys(grouped),
        },
      },
      select: {
        code: true,
        name: true,
        description: true,
      },
    });

    const masterServiceLineMap = masterServiceLines.reduce((acc, master) => {
      acc[master.code] = {
        name: master.name,
        description: master.description,
      };
      return acc;
    }, {} as Record<string, { name: string; description: string | null }>);

    // 6. Format response
    const response = Object.entries(grouped).map(([masterCode, groups]) => ({
      masterCode,
      masterName: masterServiceLineMap[masterCode]?.name || masterCode,
      masterDescription: masterServiceLineMap[masterCode]?.description || null,
      groups: groups.sort((a, b) => a.code.localeCompare(b.code)),
    }));

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch sub-service line groups');
  }
}
