import { ragEngine } from '@/lib/tools/tax-opinion/services/ragEngine';
import { bingSearchService } from './bingSearchService';
import { logger } from '@/lib/utils/logger';
import { 
  CombinedSearchResult, 
  InternalDocumentResult, 
  ExternalSearchResult,
  SearchFilters,
  SearchResponse 
} from '@/types/search';

/**
 * Enhanced Search Service
 * Orchestrates searches across both internal documents (Azure AI Search) and external web (Bing)
 */
export class EnhancedSearchService {
  /**
   * Search all sources (internal documents and web)
   */
  async searchAll(
    query: string,
    taskId: number,
    includeWeb: boolean = true,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    logger.info('Enhanced search initiated', { query, taskId, includeWeb });

    const [internalResults, externalResults] = await Promise.all([
      this.searchInternalDocuments(query, taskId, filters),
      includeWeb ? this.searchExternal(query) : Promise.resolve([]),
    ]);

    const combined = this.combineResults(internalResults, externalResults);

    return {
      results: combined,
      totalCount: combined.length,
      query,
      sources: includeWeb ? ['internal', 'external'] : ['internal'],
    };
  }

  /**
   * Search internal documents using enhanced RAG
   */
  async searchInternalDocuments(
    query: string,
    taskId: number,
    filters?: SearchFilters
  ): Promise<InternalDocumentResult[]> {
    try {
      if (!ragEngine.isReady()) {
        logger.info('RAG engine not configured, skipping internal search');
        return [];
      }

      let results;

      // Use appropriate search method based on filters
      if (filters) {
        if (filters.categories && filters.categories.length > 0) {
          results = await ragEngine.searchByCategories(
            query,
            taskId,
            filters.categories,
            filters.limit || 10
          );
        } else if (filters.dateFrom && filters.dateTo) {
          results = await ragEngine.searchByDateRange(
            query,
            taskId,
            filters.dateFrom,
            filters.dateTo,
            filters.limit || 10
          );
        } else {
          results = await ragEngine.searchWithFilters(
            query,
            taskId,
            {
              categories: filters.categories,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            },
            filters.limit || 10
          );
        }
      } else {
        // Default to hybrid search for best results
        results = await ragEngine.hybridSearch(query, taskId, 10);
      }

      // Map to InternalDocumentResult format
      return results.map((result) => ({
        ...result,
        source: 'internal' as const,
      }));
    } catch (error) {
      logger.error('Error searching internal documents:', error);
      return [];
    }
  }

  /**
   * Search external web sources using Bing
   */
  async searchExternal(query: string): Promise<ExternalSearchResult[]> {
    try {
      if (!bingSearchService.isEnabled()) {
        logger.info('Bing search not configured, skipping external search');
        return [];
      }

      const results = await bingSearchService.searchWeb(query, 5);

      // Map to ExternalSearchResult format
      return results.map((result) => ({
        ...result,
        source: 'external' as const,
      }));
    } catch (error) {
      logger.error('Error searching external sources:', error);
      return [];
    }
  }

  /**
   * Combine and rank results from internal and external sources
   */
  private combineResults(
    internalResults: InternalDocumentResult[],
    externalResults: ExternalSearchResult[]
  ): CombinedSearchResult[] {
    const combined: CombinedSearchResult[] = [];

    // Add internal results first (usually more relevant)
    combined.push(...internalResults);

    // Add external results
    combined.push(...externalResults);

    // Sort by relevance score (if available)
    combined.sort((a, b) => {
      const scoreA = 'score' in a && a.score !== undefined ? a.score : 0;
      const scoreB = 'score' in b && b.score !== undefined ? b.score : 0;
      return scoreB - scoreA;
    });

    logger.info('Combined search results', {
      internal: internalResults.length,
      external: externalResults.length,
      total: combined.length,
    });

    return combined;
  }

  /**
   * Search specifically for tax law (internal + external)
   */
  async searchTaxLaw(
    query: string,
    taskId: number,
    jurisdiction: string = 'South Africa'
  ): Promise<SearchResponse> {
    logger.info('Tax law search initiated', { query, taskId, jurisdiction });

    const [internalResults, externalResults] = await Promise.all([
      this.searchInternalDocuments(query, taskId, {
        categories: ['tax_law', 'legislation', 'regulation'],
      }),
      bingSearchService.isEnabled()
        ? bingSearchService.searchTaxLaw(query, jurisdiction)
        : Promise.resolve([]),
    ]);

    const externalFormatted: ExternalSearchResult[] = externalResults.map((result) => ({
      ...result,
      source: 'external' as const,
    }));

    const combined = this.combineResults(internalResults, externalFormatted);

    return {
      results: combined,
      totalCount: combined.length,
      query,
      sources: ['internal', 'external'],
    };
  }

  /**
   * Search for legal precedents (internal + external)
   */
  async searchLegalPrecedents(
    query: string,
    taskId: number,
    jurisdiction: string = 'South Africa'
  ): Promise<SearchResponse> {
    logger.info('Legal precedent search initiated', { query, taskId, jurisdiction });

    const [internalResults, externalResults] = await Promise.all([
      this.searchInternalDocuments(query, taskId, {
        categories: ['legal_precedent', 'case_law', 'court_decision'],
      }),
      bingSearchService.isEnabled()
        ? bingSearchService.searchLegalPrecedents(query, jurisdiction)
        : Promise.resolve([]),
    ]);

    const externalFormatted: ExternalSearchResult[] = externalResults.map((result) => ({
      ...result,
      source: 'external' as const,
    }));

    const combined = this.combineResults(internalResults, externalFormatted);

    return {
      results: combined,
      totalCount: combined.length,
      query,
      sources: ['internal', 'external'],
    };
  }
}

// Singleton instance
export const enhancedSearchService = new EnhancedSearchService();


