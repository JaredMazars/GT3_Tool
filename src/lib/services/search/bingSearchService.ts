import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';
import { BingSearchResult, TaxLawSearchResult, LegalPrecedentResult } from '@/types/search';

/**
 * Bing API response type
 */
interface BingWebPage {
  name: string;
  url: string;
  snippet: string;
  datePublished?: string;
  datePublishedDisplayText?: string;
  provider?: Array<{ name: string }>;
}

interface BingSearchResponse {
  webPages?: {
    value: BingWebPage[];
    totalEstimatedMatches?: number;
  };
}

/**
 * Bing Web Search Service
 */
export class BingSearchService {
  private apiKey: string;
  private endpoint: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = env.azureBingSearchApiKey || '';
    this.endpoint = env.azureBingSearchEndpoint;
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      logger.warn('Bing Search API key not configured. Web search features will be disabled.');
    }
  }

  /**
   * Check if Bing Search is configured
   */
  static isConfigured(): boolean {
    return !!(env.azureBingSearchApiKey);
  }

  /**
   * Check if this instance is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Perform general web search
   */
  async searchWeb(
    query: string,
    count: number = 10,
    market: string = 'en-ZA'
  ): Promise<BingSearchResult[]> {
    if (!this.enabled) {
      logger.info('Bing Search not configured, returning empty results');
      return [];
    }

    try {
      const url = new URL(this.endpoint);
      url.searchParams.set('q', query);
      url.searchParams.set('count', count.toString());
      url.searchParams.set('mkt', market);
      url.searchParams.set('responseFilter', 'Webpages');

      const response = await fetch(url.toString(), {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        logger.error('Bing Search API error:', {
          status: response.status,
          statusText: response.statusText,
        });
        return [];
      }

      const data: BingSearchResponse = await response.json();
      return this.formatResults(data.webPages?.value || []);
    } catch (error) {
      logger.error('Error performing Bing web search:', error);
      return [];
    }
  }

  /**
   * Search specifically for tax law information
   */
  async searchTaxLaw(
    query: string,
    jurisdiction: string = 'South Africa'
  ): Promise<TaxLawSearchResult[]> {
    // Enhance query with tax law context
    const enhancedQuery = `${query} ${jurisdiction} tax law legislation SARS`;

    const results = await this.searchWeb(enhancedQuery, 15, 'en-ZA');

    // Filter and rank results based on tax law relevance
    const taxResults: TaxLawSearchResult[] = results.map((result) => ({
      ...result,
      jurisdiction,
      relevance: this.calculateTaxRelevance(result),
      category: 'tax_law',
    }));

    // Sort by relevance
    return taxResults.sort((a, b) => {
      const scoreA = parseFloat(a.relevance || '0');
      const scoreB = parseFloat(b.relevance || '0');
      return scoreB - scoreA;
    });
  }

  /**
   * Search for legal precedents and case law
   */
  async searchLegalPrecedents(
    query: string,
    jurisdiction: string = 'South Africa'
  ): Promise<LegalPrecedentResult[]> {
    // Enhance query with case law context
    const enhancedQuery = `${query} ${jurisdiction} court case judgment precedent`;

    const results = await this.searchWeb(enhancedQuery, 15, 'en-ZA');

    // Parse and structure as legal precedents
    const precedents: LegalPrecedentResult[] = results.map((result) => ({
      ...result,
      jurisdiction,
      caseName: this.extractCaseName(result.title),
      court: this.extractCourt(result.snippet),
      year: this.extractYear(result.datePublished || result.snippet),
      citation: this.extractCitation(result.snippet),
    }));

    return precedents;
  }

  /**
   * Format raw Bing results to standard format
   */
  private formatResults(rawResults: BingWebPage[]): BingSearchResult[] {
    return rawResults.map((result) => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet,
      datePublished: result.datePublished,
      provider: result.provider?.[0]?.name,
    }));
  }

  /**
   * Calculate tax law relevance score
   */
  private calculateTaxRelevance(result: BingSearchResult): string {
    let score = 0;

    // Keywords that indicate tax law relevance
    const taxKeywords = [
      'tax',
      'sars',
      'revenue',
      'income tax act',
      'vat',
      'legislation',
      'regulation',
      'treasury',
      'hmrc',
    ];

    const textToCheck = `${result.title} ${result.snippet}`.toLowerCase();

    taxKeywords.forEach((keyword) => {
      if (textToCheck.includes(keyword)) {
        score += 1;
      }
    });

    // Boost official sources
    const officialDomains = ['sars.gov.za', 'treasury.gov.za', 'gov.za', 'legislation.gov'];
    if (officialDomains.some((domain) => result.url.includes(domain))) {
      score += 5;
    }

    return score.toFixed(2);
  }

  /**
   * Extract case name from title
   */
  private extractCaseName(title: string): string {
    // Limit input length to prevent ReDoS
    const safeTitle = title.substring(0, 500);
    // Simple heuristic: Look for "v" or "vs" pattern (non-greedy with length limit)
    const vPattern = /^(.{1,200}?)\s+v[s]?\s+(.{1,200})$/i;
    const match = safeTitle.match(vPattern);
    const splitTitle = safeTitle.split('|')[0];
    return match ? safeTitle : (splitTitle ? splitTitle.trim() : safeTitle);
  }

  /**
   * Extract court name from snippet
   */
  private extractCourt(snippet: string): string | undefined {
    const courtPatterns = [
      /Supreme Court/i,
      /High Court/i,
      /Constitutional Court/i,
      /Tax Court/i,
      /Court of Appeal/i,
      /Magistrate.*Court/i,
    ];

    for (const pattern of courtPatterns) {
      const match = snippet.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Extract year from date or text
   */
  private extractYear(text: string): number | undefined {
    const yearPattern = /\b(19|20)\d{2}\b/;
    const match = text.match(yearPattern);
    return match ? Number.parseInt(match[0], 10) : undefined;
  }

  /**
   * Extract legal citation from snippet
   */
  private extractCitation(snippet: string): string | undefined {
    // Look for common citation patterns
    const citationPatterns = [
      /\[\d{4}\]\s+\w+/,  // [2024] ZATC
      /\(\d{4}\)\s+\w+/,  // (2024) SATC
      /\d{4}\s+\(\d+\)\s+\w+/, // 2024 (1) SA
    ];

    for (const pattern of citationPatterns) {
      const match = snippet.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }
}

// Singleton instance
export const bingSearchService = new BingSearchService();


