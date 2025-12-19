import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getAllExternalServiceLines } from '@/lib/utils/serviceLineExternal';
import { getAllServiceLines } from '@/lib/utils/serviceLine';

/**
 * GET /api/admin/service-line-mapping
 * Get all external service lines with their master service line mappings
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user }) => {
    const externalServiceLines = await getAllExternalServiceLines();
    const masterServiceLines = await getAllServiceLines();

    const enrichedData = externalServiceLines.map((external) => {
      const master = external.masterCode
        ? masterServiceLines.find((m) => m.code === external.masterCode)
        : null;

      return {
        ...external,
        masterServiceLine: master || null,
      };
    });

    return NextResponse.json(
      successResponse({
        externalServiceLines: enrichedData,
        masterServiceLines,
      })
    );
  },
});
