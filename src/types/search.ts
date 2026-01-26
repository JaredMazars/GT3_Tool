/**
 * Search-related types and interfaces
 */

/**
 * Bing search result
 */
export interface BingSearchResult {
  title: string;
  url: string;
  snippet: string;
  datePublished?: string;
  provider?: string;
  score?: number;
}

/**
 * Tax law search result (specialized)
 */
export interface TaxLawSearchResult extends BingSearchResult {
  jurisdiction?: string;
  relevance?: string;
  category?: string;
}

/**
 * Legal precedent search result
 */
export interface LegalPrecedentResult extends BingSearchResult {
  caseName?: string;
  court?: string;
  year?: number;
  citation?: string;
  jurisdiction?: string;
}

/**
 * Search filters
 */
export interface SearchFilters {
  dateFrom?: Date;
  dateTo?: Date;
  jurisdiction?: string;
  category?: string;
  categories?: string[];
  limit?: number;
}

/**
 * Internal document search result (from Azure AI Search)
 */
export interface InternalDocumentResult {
  content: string;
  fileName: string;
  category: string;
  score: number;
  documentId: number;
  source: 'internal';
}

/**
 * External web search result
 */
export interface ExternalSearchResult extends BingSearchResult {
  source: 'external';
}

/**
 * Combined search result (internal + external)
 */
export type CombinedSearchResult = InternalDocumentResult | ExternalSearchResult;

/**
 * Search response
 */
export interface SearchResponse {
  results: CombinedSearchResult[];
  totalCount: number;
  query: string;
  sources: ('internal' | 'external')[];
}


