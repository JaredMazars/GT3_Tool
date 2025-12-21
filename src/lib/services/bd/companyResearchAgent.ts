/**
 * Company Research Agent Service
 * AI-powered company research using Azure AI Agent Service with Grounding with Bing Search
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { models, getModelParams } from '@/lib/ai/config';
import { azureAIAgentClient, AzureAIAgentClient } from '@/lib/ai/agentClient';
import { bingSearchService } from '@/lib/services/search/bingSearchService';
import { logger } from '@/lib/utils/logger';

/**
 * Company research result structure
 */
export interface CompanyResearchResult {
  companyName: string;
  overview: {
    description: string;
    industry: string;
    sector: string;
    estimatedSize: string;
    founded: string | null;
    headquarters: string | null;
    website: string | null;
  };
  riskAssessment: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
    riskFactors: Array<{
      category: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    positiveIndicators: string[];
    concerns: string[];
  };
  financialHealth: {
    status: 'HEALTHY' | 'STABLE' | 'CONCERNING' | 'UNKNOWN';
    indicators: string[];
    recentNews: string[];
  };
  cipcStatus: {
    registrationStatus: string;
    companyType: string | null;
    registrationNumber: string | null;
    status: string | null;
  };
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  searchedAt: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Schema for AI-generated company analysis
 */
const CompanyAnalysisSchema = z.object({
  overview: z.object({
    description: z.string().describe('Brief description of what the company does'),
    industry: z.string().describe('Primary industry'),
    sector: z.string().describe('Business sector'),
    estimatedSize: z.string().describe('Estimated company size (e.g., SME, Large, Enterprise)'),
    founded: z.string().nullable().describe('Year founded if known'),
    headquarters: z.string().nullable().describe('Headquarters location if known'),
    website: z.string().nullable().describe('Company website URL if found'),
  }),
  riskAssessment: z.object({
    overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']).describe('Overall risk level'),
    riskFactors: z.array(z.object({
      category: z.string().describe('Risk category (e.g., Financial, Legal, Reputation)'),
      description: z.string().describe('Description of the risk'),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    })).describe('Identified risk factors'),
    positiveIndicators: z.array(z.string()).describe('Positive indicators about the company'),
    concerns: z.array(z.string()).describe('Concerns or red flags'),
  }),
  financialHealth: z.object({
    status: z.enum(['HEALTHY', 'STABLE', 'CONCERNING', 'UNKNOWN']).describe('Financial health status'),
    indicators: z.array(z.string()).describe('Financial health indicators found'),
    recentNews: z.array(z.string()).describe('Recent financial news'),
  }),
  cipcStatus: z.object({
    registrationStatus: z.string().describe('CIPC registration status if found'),
    companyType: z.string().nullable().describe('Company type (Pty Ltd, etc.)'),
    registrationNumber: z.string().nullable().describe('CIPC registration number if found'),
    status: z.string().nullable().describe('Business status (Active, Deregistered, etc.)'),
  }),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level in the analysis based on available information'),
});

/**
 * Inferred type from the schema
 */
type CompanyAnalysis = z.infer<typeof CompanyAnalysisSchema>;

/**
 * Company Research Agent
 * Performs comprehensive company research using Azure AI Agent Service with Grounding with Bing Search
 */
export class CompanyResearchAgent {
  /**
   * Research a company by name
   * Uses Azure AI Agent Service with Grounding with Bing Search if available,
   * falls back to direct Bing Search API if not
   */
  async research(companyName: string): Promise<CompanyResearchResult> {
    logger.info('Starting company research', { companyName });

    // Try Azure AI Agent Service first (preferred - uses Grounding with Bing)
    if (AzureAIAgentClient.isConfigured()) {
      return this.researchWithAgent(companyName);
    }

    // Fall back to direct Bing Search API
    if (bingSearchService.isEnabled()) {
      return this.researchWithBingAPI(companyName);
    }

    // No search service available
    logger.warn('No search service available for company research', { companyName });
    return this.createEmptyResult(companyName);
  }

  /**
   * Research using Azure AI Agent Service with Grounding with Bing Search
   */
  private async researchWithAgent(companyName: string): Promise<CompanyResearchResult> {
    logger.info('Using Azure AI Agent Service for company research', { companyName });

    const prompt = `You are a professional business intelligence analyst. Research the company "${companyName}" in South Africa and provide a comprehensive due diligence report. Do not use Datanyze, RocketReach, Hunter or other similar third party services to research the company. Use only news pages or the companies website and CIPC registration information.

Please use the bing grounding search for information and analyze.  Search only for information sources from the country in which the company is situated.  Include only sources and news generated in the last 12 months:

1. **Company Overview**: What does this company do? What industry and sector are they in? Estimated size, founding date, headquarters location, and website.

2. **Risk Assessment**: Look for any red flags, legal issues, lawsuits, regulatory problems, reputation concerns, or negative news. Also identify positive indicators like awards, certifications, or good press.

3. **Financial Health**: Search for any financial information - revenue, profit, funding, financial news, stability indicators.

4. **CIPC Registration**: Look for South African Companies and Intellectual Property Commission (CIPC) registration information - registration number, company type (Pty Ltd, etc.), and business status. Ensure that the registration number is valid and that the company is registered in South Africa.

Be thorough and objective. If you cannot find information on a topic, say so rather than guessing. This analysis is for business development due diligence purposes. Don not include old information or sources that are not relevant to the company.

Provide your findings with citations to the sources you found.`;

    try {
      const agentResponse = await azureAIAgentClient.chat(prompt);

      // Convert citations to sources format
      const sources = agentResponse.citations.map(c => ({
        title: c.title,
        url: c.url,
        snippet: c.snippet || '',
      }));

      // Parse the agent's response into structured format using AI
      const analysis = await this.parseAgentResponse(companyName, agentResponse.content);

      const result = {
        companyName,
        ...analysis,
        sources,
        searchedAt: new Date().toISOString(),
      };
      return result;
    } catch (error) {
      logger.error('Error in Azure AI Agent research', { error, companyName });
      
      // Fall back to Bing API if available
      if (bingSearchService.isEnabled()) {
        logger.info('Falling back to Bing Search API', { companyName });
        return this.researchWithBingAPI(companyName);
      }

      return this.createEmptyResult(companyName);
    }
  }

  /**
   * Parse the agent's natural language response into structured format
   */
  private async parseAgentResponse(companyName: string, agentContent: string): Promise<CompanyAnalysis> {
    const prompt = `You are a data extraction assistant. Extract structured information from the following company research report about "${companyName}".

## Research Report:
${agentContent}

## Your Task:
Extract and structure the information into the required format. If any information is not available in the report, use appropriate defaults (null for optional fields, "Unknown" for required strings, empty arrays for lists).

Base your confidence level on how comprehensive the original research was.`;

    try {
      const result = await generateObject({
        model: models.mini,
        schema: CompanyAnalysisSchema,
        prompt,
        ...getModelParams({ temperature: 0.1 }),
      });

      return result.object as CompanyAnalysis;
    } catch (error) {
      logger.error('Error parsing agent response', { error, companyName });
      return this.createDefaultAnalysis();
    }
  }

  /**
   * Research using direct Bing Search API (fallback)
   */
  private async researchWithBingAPI(companyName: string): Promise<CompanyResearchResult> {
    logger.info('Using Bing Search API for company research', { companyName });

    // Perform multiple parallel searches
    const [
      generalResults,
      newsResults,
      financialResults,
      cipcResults,
    ] = await Promise.all([
      this.searchGeneral(companyName),
      this.searchNews(companyName),
      this.searchFinancial(companyName),
      this.searchCIPC(companyName),
    ]);

    // Combine all search results
    const allResults = [
      ...generalResults,
      ...newsResults,
      ...financialResults,
      ...cipcResults,
    ];

    // Format sources for the result
    const sources = allResults.slice(0, 10).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));

    // If no results found, return unknown status
    if (allResults.length === 0) {
      logger.warn('No search results found for company', { companyName });
      return this.createEmptyResult(companyName);
    }

    // Use AI to analyze the search results
    const analysis = await this.analyzeResults(companyName, allResults);

    return {
      companyName,
      ...analysis,
      sources,
      searchedAt: new Date().toISOString(),
    };
  }

  /**
   * General company search
   */
  private async searchGeneral(companyName: string) {
    try {
      const query = `"${companyName}" company South Africa about`;
      return await bingSearchService.searchWeb(query, 5, 'en-ZA');
    } catch (error) {
      logger.error('Error in general search', { error, companyName });
      return [];
    }
  }

  /**
   * Search for company news
   */
  private async searchNews(companyName: string) {
    try {
      const query = `"${companyName}" news South Africa recent`;
      return await bingSearchService.searchWeb(query, 5, 'en-ZA');
    } catch (error) {
      logger.error('Error in news search', { error, companyName });
      return [];
    }
  }

  /**
   * Search for financial information
   */
  private async searchFinancial(companyName: string) {
    try {
      const query = `"${companyName}" financial results revenue profit South Africa`;
      return await bingSearchService.searchWeb(query, 5, 'en-ZA');
    } catch (error) {
      logger.error('Error in financial search', { error, companyName });
      return [];
    }
  }

  /**
   * Search CIPC (Companies and Intellectual Property Commission) registry
   */
  private async searchCIPC(companyName: string) {
    try {
      const query = `"${companyName}" CIPC registration South Africa company registry`;
      return await bingSearchService.searchWeb(query, 5, 'en-ZA');
    } catch (error) {
      logger.error('Error in CIPC search', { error, companyName });
      return [];
    }
  }

  /**
   * Use AI to analyze search results and create structured company profile
   */
  private async analyzeResults(
    companyName: string,
    searchResults: Array<{ title: string; url: string; snippet: string }>
  ): Promise<CompanyAnalysis> {
    const searchContext = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
      .join('\n\n');

    const prompt = `You are a professional business intelligence analyst. Analyze the following web search results about the company "${companyName}" and provide a comprehensive company profile.

## Search Results:
${searchContext}

## Your Task:
Based on the search results above, analyze and provide:

1. **Overview**: What does this company do? Industry, sector, size, location, when founded
2. **Risk Assessment**: Identify any red flags, legal issues, reputation concerns, or positive indicators
3. **Financial Health**: Any financial information, recent performance, stability indicators
4. **CIPC Status**: Any information about their South African company registration

Be objective and factual. If information is not available in the search results, indicate it as unknown rather than making assumptions. Base your confidence level on how much reliable information was found.

Important: This analysis is for due diligence purposes in business development. Highlight both opportunities and concerns.`;

    try {
      const result = await generateObject({
        model: models.mini,
        schema: CompanyAnalysisSchema,
        prompt,
        ...getModelParams({ temperature: 0.3 }),
      });

      return result.object as CompanyAnalysis;
    } catch (error) {
      logger.error('Error in AI analysis', { error, companyName });
      return this.createDefaultAnalysis();
    }
  }

  /**
   * Create default analysis when AI fails
   */
  private createDefaultAnalysis(): CompanyAnalysis {
    return {
      overview: {
        description: 'Unable to analyze - AI service unavailable',
        industry: 'Unknown',
        sector: 'Unknown',
        estimatedSize: 'Unknown',
        founded: null,
        headquarters: null,
        website: null,
      },
      riskAssessment: {
        overallRisk: 'UNKNOWN' as const,
        riskFactors: [],
        positiveIndicators: [],
        concerns: ['Unable to complete full analysis'],
      },
      financialHealth: {
        status: 'UNKNOWN' as const,
        indicators: [],
        recentNews: [],
      },
      cipcStatus: {
        registrationStatus: 'Unknown',
        companyType: null,
        registrationNumber: null,
        status: null,
      },
      confidence: 'LOW' as const,
    };
  }

  /**
   * Create empty result when no search results found
   */
  private createEmptyResult(companyName: string): CompanyResearchResult {
    return {
      companyName,
      overview: {
        description: 'No information found for this company',
        industry: 'Unknown',
        sector: 'Unknown',
        estimatedSize: 'Unknown',
        founded: null,
        headquarters: null,
        website: null,
      },
      riskAssessment: {
        overallRisk: 'UNKNOWN',
        riskFactors: [],
        positiveIndicators: [],
        concerns: ['No online presence found - may indicate new or very small business'],
      },
      financialHealth: {
        status: 'UNKNOWN',
        indicators: [],
        recentNews: [],
      },
      cipcStatus: {
        registrationStatus: 'No information found',
        companyType: null,
        registrationNumber: null,
        status: null,
      },
      sources: [],
      searchedAt: new Date().toISOString(),
      confidence: 'LOW',
    };
  }

  /**
   * Check if the research service is available
   * Returns true if either Azure AI Agent or Bing Search API is configured
   */
  static isAvailable(): boolean {
    return AzureAIAgentClient.isConfigured() || bingSearchService.isEnabled();
  }
}

// Singleton instance
export const companyResearchAgent = new CompanyResearchAgent();
