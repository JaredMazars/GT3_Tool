import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { setExternalMapping } from '@/lib/utils/serviceLineExternal';
import { z } from 'zod';

const updateMappingSchema = z.object({
  masterCode: z.string().nullable(),
}).strict();

/**
 * PUT /api/admin/service-line-mapping/[id]
 * Update a service line mapping
 */
export const PUT = secureRoute.mutationWithParams<typeof updateMappingSchema, { id: string }>({
  feature: Feature.MANAGE_SERVICE_LINES,
  schema: updateMappingSchema,
  handler: async (request, { user, data, params }) => {
    const externalId = parseNumericId(params.id, 'External service line ID');

    const updated = await setExternalMapping(externalId, data.masterCode);

    return NextResponse.json(successResponse(updated));
  },
});
