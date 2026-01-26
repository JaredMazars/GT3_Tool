/**
 * Company Research API Route
 * POST /api/bd/company-research - Research a company using AI and web search
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CompanyResearchSchema } from '@/lib/validation/schemas';
import { companyResearchAgent, CompanyResearchAgent } from '@/lib/services/bd/companyResearchAgent';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/bd/company-research
 * Research a company by name using AI-powered web search analysis
 */
export const POST = secureRoute.ai({
  schema: CompanyResearchSchema,
  handler: async (request, { user, data }) => {
    const { companyName } = data;

    logger.info('Company research requested', {
      companyName,
      userId: user.id,
    });

    // Check if research service is available
    if (!CompanyResearchAgent.isAvailable()) {
      throw new AppError(
        503,
        'Company research service is not configured. Please configure Azure AI Agent or Bing Search API.',
        ErrorCodes.EXTERNAL_API_ERROR,
        { service: 'CompanyResearch' }
      );
    }

    // Perform research
    const result = await companyResearchAgent.research(companyName);

    logger.info('Company research completed', {
      companyName,
      confidence: result.confidence,
      sourcesCount: result.sources.length,
    });

    return NextResponse.json(successResponse(result));
  },
});

/**
 * GET /api/bd/company-research
 * Check if research service is available
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async () => {
    const isAvailable = CompanyResearchAgent.isAvailable();

    return NextResponse.json(
      successResponse({
        available: isAvailable,
        message: isAvailable
          ? 'Company research service is available'
          : 'Company research service is not configured. Azure AI Agent or Bing Search API required.',
      })
    );
  },
});
