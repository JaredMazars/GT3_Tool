/**
 * Company Research Agent Service
 * AI-powered company research using Azure AI Agent Service with Grounding with Bing Search
 */

import { z } from 'zod';
import { azureAIAgentClient, AzureAIAgentClient } from '@/lib/ai/agentClient';
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
   * Uses Azure AI Agent Service with Grounding with Bing Search
   */
  async research(companyName: string): Promise<CompanyResearchResult> {
    logger.info('Starting company research', { companyName });

    // Check if agent is configured
    if (!AzureAIAgentClient.isConfigured()) {
      return this.createEmptyResult(companyName);
    }

    return this.researchWithAgent(companyName);
  }

  /**
   * Research using Azure AI Agent Service with Grounding with Bing Search
   */
  private async researchWithAgent(companyName: string): Promise<CompanyResearchResult> {
    logger.info('Using Azure AI Agent Service for company research', { companyName });

    // Agent is pre-configured with research instructions
    // Explicitly request web search and JSON output
    const prompt = `Use Bing Search to research ${companyName} in South Africa. Find current information from news, official websites, and CIPC records. Return JSON only with sources.`;

    try {
      const agentResponse = await azureAIAgentClient.chat(prompt);

      // Agent may return JSON wrapped in markdown code fences and/or with trailing text
      let jsonContent = agentResponse.content.trim();
      
      // Remove markdown code fences
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Extract only the JSON object - find matching braces
      const firstBrace = jsonContent.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let endPos = -1;
        for (let i = firstBrace; i < jsonContent.length; i++) {
          if (jsonContent[i] === '{') braceCount++;
          else if (jsonContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPos = i + 1;
              break;
            }
          }
        }
        if (endPos !== -1) {
          jsonContent = jsonContent.substring(firstBrace, endPos);
        }
      }
      
      const rawAnalysis = JSON.parse(jsonContent) as Record<string, unknown>;
      
      // Map agent's field names (various formats) to expected schema (camelCase)
      const rawOverview = (rawAnalysis['Company Overview'] || rawAnalysis.CompanyOverview || rawAnalysis.overview) as Record<string, unknown> | undefined;
      const rawRisk = (rawAnalysis['Risk Assessment'] || rawAnalysis.RiskAssessment || rawAnalysis.riskAssessment) as Record<string, unknown> | undefined;
      const rawFinancial = (rawAnalysis['Financial Health'] || rawAnalysis.FinancialHealth || rawAnalysis.financialHealth) as Record<string, unknown> | undefined;
      const rawCipc = (rawAnalysis['CIPC Registration'] || rawAnalysis.CIPCRegistration || rawAnalysis.cipcStatus) as Record<string, unknown> | undefined;
      
      const analysis: CompanyAnalysis = {
        overview: {
          description: (typeof rawOverview?.description === 'string' ? rawOverview.description : 'No information available'),
          industry: (typeof rawOverview?.industry === 'string' ? rawOverview.industry : 'Unknown'),
          sector: (typeof rawOverview?.sector === 'string' ? rawOverview.sector : 'Unknown'),
          estimatedSize: (typeof rawOverview?.estimatedSize === 'string' ? rawOverview.estimatedSize : 'Unknown'),
          founded: (typeof rawOverview?.founded === 'string' ? rawOverview.founded : null),
          headquarters: (typeof rawOverview?.headquarters === 'string' ? rawOverview.headquarters : null),
          website: (typeof rawOverview?.website === 'string' ? rawOverview.website : null),
        },
        riskAssessment: {
          overallRisk: (rawRisk?.overallRisk === 'LOW' || rawRisk?.overallRisk === 'MEDIUM' || rawRisk?.overallRisk === 'HIGH' ? rawRisk.overallRisk : 'UNKNOWN'),
          riskFactors: Array.isArray(rawRisk?.riskFactors) ? rawRisk.riskFactors : [],
          positiveIndicators: Array.isArray(rawRisk?.positiveIndicators) ? rawRisk.positiveIndicators : [],
          concerns: Array.isArray(rawRisk?.concerns) ? rawRisk.concerns : [],
        },
        financialHealth: {
          status: (rawFinancial?.status === 'HEALTHY' || rawFinancial?.status === 'STABLE' || rawFinancial?.status === 'CONCERNING' ? rawFinancial.status : 'UNKNOWN'),
          indicators: Array.isArray(rawFinancial?.indicators) ? rawFinancial.indicators : [],
          recentNews: Array.isArray(rawFinancial?.recentNews) ? rawFinancial.recentNews : [],
        },
        cipcStatus: {
          registrationStatus: (typeof rawCipc?.registrationStatus === 'string' ? rawCipc.registrationStatus : 'No information found'),
          companyType: (typeof rawCipc?.companyType === 'string' ? rawCipc.companyType : null),
          registrationNumber: (typeof rawCipc?.registrationNumber === 'string' ? rawCipc.registrationNumber : null),
          status: (typeof rawCipc?.status === 'string' ? rawCipc.status : null),
        },
        confidence: (rawAnalysis.confidence === 'HIGH' || rawAnalysis.confidence === 'MEDIUM' || rawAnalysis.confidence === 'LOW' ? rawAnalysis.confidence : 'MEDIUM'),
      };

      // Extract sources from multiple possible locations
      const sources = [];
      
      // 1. Try API-level citations (if Bing grounding was used)
      if (agentResponse.citations && agentResponse.citations.length > 0) {
        sources.push(...agentResponse.citations.map(c => ({
          title: c.title,
          url: c.url,
          snippet: c.snippet || '',
        })));
      }
      
      // 2. Try JSON embedded sources (if agent included them in response)
      if (rawAnalysis.sources && Array.isArray(rawAnalysis.sources)) {
        sources.push(...rawAnalysis.sources.map((s: Record<string, unknown>) => ({
          title: (typeof s.title === 'string' ? s.title : 'Source'),
          url: (typeof s.url === 'string' ? s.url : ''),
          snippet: (typeof s.snippet === 'string' ? s.snippet : ''),
        })));
      }

      const result = {
        companyName,
        ...analysis,
        sources,
        searchedAt: new Date().toISOString(),
      };
      return result;
    } catch (error) {
      return this.createEmptyResult(companyName);
    }
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
   * Returns true if Azure AI Agent is configured
   */
  static isAvailable(): boolean {
    return AzureAIAgentClient.isConfigured();
  }
}

// Singleton instance
export const companyResearchAgent = new CompanyResearchAgent();
