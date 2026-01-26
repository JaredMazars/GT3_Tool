import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { embedMany } from 'ai';
import { models } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { downloadFile } from '@/lib/services/documents/blobStorage';
import { documentIntelligence, DocumentIntelligence } from '@/lib/services/documents/documentIntelligence';

// Azure AI Search configuration
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT || '';
const searchApiKey = process.env.AZURE_SEARCH_API_KEY || '';
const indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'opinion-documents';

interface DocumentChunk {
  id: string;
  draftId: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  fileName: string;
  category: string;
  metadata: string;
  uploadedDate?: string;
  author?: string;
  projectScope?: number;
}

interface SearchResult {
  content: string;
  fileName: string;
  category: string;
  score: number;
  documentId: number;
}

interface CitedSource {
  documentId: number;
  fileName: string;
  category: string;
  relevantChunks: string[];
}

export class RAGEngine {
  private searchClient: SearchClient<DocumentChunk> | null = null;
  private configured: boolean;

  constructor() {
    this.configured = !!searchEndpoint && !!searchApiKey;
    
    if (!this.configured) {
      // Azure AI Search not configured - document search will be disabled
      return;
    }
    
    // Azure AI Search configured successfully
    this.searchClient = new SearchClient<DocumentChunk>(
      searchEndpoint,
      indexName,
      new AzureKeyCredential(searchApiKey)
    );
  }

  /**
   * Check if RAG is configured
   */
  static isConfigured(): boolean {
    return !!searchEndpoint && !!searchApiKey;
  }
  
  /**
   * Check if this instance is configured
   */
  isReady(): boolean {
    return this.configured && this.searchClient !== null;
  }

  /**
   * Extract text from document buffer based on file type
   */
  private async extractText(buffer: Buffer, fileType: string): Promise<string> {
    const extension = fileType.toLowerCase();

    try {
      if (extension === 'txt') {
        return buffer.toString('utf-8');
      } else if (extension === 'docx' || extension === 'doc') {
        // Dynamic import to avoid Next.js SSR issues
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } else if (extension === 'pdf') {
        // Use Azure Document Intelligence for PDF extraction
        if (DocumentIntelligence.isConfigured()) {
          logger.info('Extracting PDF text using Azure Document Intelligence...');
          const text = await documentIntelligence.extractTextFromPDF(buffer);
          return text;
        } else {
          logger.warn(`Azure Document Intelligence not configured. PDF text extraction unavailable.`);
          return '[PDF document uploaded - Azure Document Intelligence not configured. Text extraction unavailable.]';
        }
      } else {
        logger.warn(`Unsupported file type: ${fileType}`);
        return `[${fileType.toUpperCase()} document uploaded - text extraction not available for this file type.]`;
      }
    } catch (error) {
      logger.error(`Error extracting text from ${fileType}:`, error);
      // Return a placeholder instead of throwing
      return `[Document uploaded - text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * Chunk text into manageable pieces for embedding
   */
  private chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Index a document for semantic search
   */
  async indexDocument(
    documentId: number,
    draftId: number,
    fileName: string,
    category: string,
    filePath: string,
    fileType: string,
    author?: string,
    projectScope?: number
  ): Promise<string> {
    try {
      logger.info(`📄 Starting document indexing: ${fileName} (ID: ${documentId})`);
      
      // Download file from blob storage
      const buffer = await downloadFile(filePath);
      logger.info(`✅ Downloaded file from blob storage: ${filePath}`);
      
      // Extract text from document
      const extractedText = await this.extractText(buffer, fileType);
      logger.info(`✅ Extracted ${extractedText.length} characters from ${fileName}`);
      
      if (!this.searchClient) {
        logger.warn(`⚠️ Azure Search not configured - document ${fileName} uploaded but not indexed for search`);
        return extractedText;
      }
      
      // Chunk the text
      const chunks = this.chunkText(extractedText);
      
      // Generate embeddings for all chunks
      logger.info(`Generating embeddings for ${chunks.length} chunks from ${fileName}`);
      
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: chunks,
      });

      // Prepare documents for indexing
      const documentsToIndex: DocumentChunk[] = chunks.map((chunk, index) => ({
        id: `${documentId}_${index}`,
        draftId,
        documentId,
        chunkIndex: index,
        content: chunk,
        embedding: embeddings[index],
        fileName,
        category,
        uploadedDate: new Date().toISOString(),
        author,
        projectScope,
        metadata: JSON.stringify({
          totalChunks: chunks.length,
          fileType,
          uploadedDate: new Date().toISOString(),
          author,
          projectScope,
        }),
      }));

      // Upload to Azure AI Search
      const result = await this.searchClient.uploadDocuments(documentsToIndex);
      
      logger.info(`Indexed ${result.results.length} chunks for document ${documentId}`);
      
      return extractedText;
    } catch (error) {
      logger.error(`Error indexing document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Perform semantic search on indexed documents
   */
  async semanticSearch(
    query: string,
    draftId: number,
    topK: number = 5,
    category?: string
  ): Promise<SearchResult[]> {
    if (!this.searchClient) {
      logger.warn('⚠️ Azure Search not configured - cannot perform semantic search');
      logger.warn('📄 Query attempted: ' + query.substring(0, 100) + (query.length > 100 ? '...' : ''));
      return [];
    }
    
    try {
      logger.info(`🔍 Semantic search requested for draftId=${draftId}, query="${query.substring(0, 100)}..."`);
      
      // Generate embedding for query
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: [query],
      });
      
      const queryEmbedding = embeddings[0];
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }
      logger.info(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

      // Build filter for draft and optional category
      let filter = `draftId eq ${draftId}`;
      if (category) {
        filter += ` and category eq '${category}'`;
      }
      logger.info(`🔎 Search filter: ${filter}`);

      // Perform vector search
      const searchResults = await this.searchClient.search(query, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: topK,
              fields: ['embedding'],
            },
          ],
        },
        filter,
        top: topK,
        select: ['content', 'fileName', 'category', 'documentId', 'chunkIndex'],
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          content: result.document.content,
          fileName: result.document.fileName,
          category: result.document.category,
          score: result.score || 0,
          documentId: result.document.documentId,
        });
      }

      logger.info(`✅ Found ${results.length} matching chunks from documents:`);
      const uniqueDocs = [...new Set(results.map(r => r.fileName))];
      logger.info(`📄 Unique documents: ${uniqueDocs.join(', ')}`);
      
      if (results.length > 0 && results[0]) {
        logger.info(`📊 Top result: ${results[0].fileName} (score: ${results[0].score?.toFixed(4)})`);
      } else {
        logger.warn(`⚠️ No results found! Check if documents are indexed for draftId=${draftId}`);
      }

      return results;
    } catch (error) {
      logger.error('❌ Error performing semantic search:', error);
      return [];
    }
  }

  /**
   * Get cited sources from search results
   */
  getCitedSources(searchResults: SearchResult[]): CitedSource[] {
    const sourceMap = new Map<number, CitedSource>();

    for (const result of searchResults) {
      if (!sourceMap.has(result.documentId)) {
        sourceMap.set(result.documentId, {
          documentId: result.documentId,
          fileName: result.fileName,
          category: result.category,
          relevantChunks: [],
        });
      }

      const source = sourceMap.get(result.documentId)!;
      source.relevantChunks.push(result.content);
    }

    return Array.from(sourceMap.values());
  }

  /**
   * Delete all chunks for a specific document
   */
  async deleteDocument(documentId: number): Promise<void> {
    if (!this.searchClient) {
      logger.info('Azure Search not configured, skipping document deletion from index');
      return;
    }
    
    try {
      // Search for all chunks belonging to this document
      const searchResults = await this.searchClient.search('*', {
        filter: `documentId eq ${documentId}`,
        select: ['id'],
      });

      const idsToDelete: string[] = [];
      for await (const result of searchResults.results) {
        idsToDelete.push(result.document.id);
      }

      if (idsToDelete.length > 0) {
        await this.searchClient.deleteDocuments('id', idsToDelete);
        logger.info(`Deleted ${idsToDelete.length} chunks for document ${documentId}`);
      }
    } catch (error) {
      logger.error(`Error deleting document ${documentId} from index:`, error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector search and keyword matching
   */
  async hybridSearch(
    query: string,
    draftId: number,
    topK: number = 5,
    category?: string
  ): Promise<SearchResult[]> {
    if (!this.searchClient) {
      logger.warn('⚠️ Azure Search not configured - cannot perform hybrid search');
      return [];
    }

    try {
      logger.info(`🔍 Hybrid search requested for draftId=${draftId}, query="${query.substring(0, 100)}..."`);

      // Generate embedding for vector search
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: [query],
      });

      const queryEmbedding = embeddings[0];
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Build filter
      let filter = `draftId eq ${draftId}`;
      if (category) {
        filter += ` and category eq '${category}'`;
      }

      // Perform hybrid search (vector + text)
      const searchResults = await this.searchClient.search(query, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: topK,
              fields: ['embedding'],
            },
          ],
        },
        filter,
        top: topK,
        select: ['content', 'fileName', 'category', 'documentId', 'chunkIndex'],
        queryType: 'semantic', // Enable semantic search
        semanticSearchOptions: {
          configurationName: 'default',
        },
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          content: result.document.content,
          fileName: result.document.fileName,
          category: result.document.category,
          score: result.score || 0,
          documentId: result.document.documentId,
        });
      }

      logger.info(`✅ Hybrid search found ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('❌ Error performing hybrid search:', error);
      // Fall back to regular semantic search
      return this.semanticSearch(query, draftId, topK, category);
    }
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    query: string,
    draftId: number,
    dateFrom: Date,
    dateTo: Date,
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (!this.searchClient) {
      logger.info('Azure Search not configured');
      return [];
    }

    try {
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: [query],
      });

      const queryEmbedding = embeddings[0];
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Build filter with date range
      const filter = `draftId eq ${draftId} and uploadedDate ge ${dateFrom.toISOString()} and uploadedDate le ${dateTo.toISOString()}`;

      const searchResults = await this.searchClient.search(query, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: topK,
              fields: ['embedding'],
            },
          ],
        },
        filter,
        top: topK,
        select: ['content', 'fileName', 'category', 'documentId', 'chunkIndex', 'uploadedDate'],
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          content: result.document.content,
          fileName: result.document.fileName,
          category: result.document.category,
          score: result.score || 0,
          documentId: result.document.documentId,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error performing date range search:', error);
      return [];
    }
  }

  /**
   * Search by multiple categories
   */
  async searchByCategories(
    query: string,
    draftId: number,
    categories: string[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (!this.searchClient) {
      logger.info('Azure Search not configured');
      return [];
    }

    try {
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: [query],
      });

      const queryEmbedding = embeddings[0];
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Build filter with multiple categories using OR
      const categoryFilter = categories.map(cat => `category eq '${cat}'`).join(' or ');
      const filter = `draftId eq ${draftId} and (${categoryFilter})`;

      const searchResults = await this.searchClient.search(query, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: topK,
              fields: ['embedding'],
            },
          ],
        },
        filter,
        top: topK,
        select: ['content', 'fileName', 'category', 'documentId', 'chunkIndex'],
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          content: result.document.content,
          fileName: result.document.fileName,
          category: result.document.category,
          score: result.score || 0,
          documentId: result.document.documentId,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error performing category search:', error);
      return [];
    }
  }

  /**
   * Search with complex filters
   */
  async searchWithFilters(
    query: string,
    draftId: number,
    filters: {
      categories?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      author?: string;
      projectScope?: number;
    },
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (!this.searchClient) {
      logger.info('Azure Search not configured');
      return [];
    }

    try {
      const { embeddings } = await embedMany({
        model: models.embedding,
        values: [query],
      });

      const queryEmbedding = embeddings[0];
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Build complex filter
      const filterParts: string[] = [`draftId eq ${draftId}`];

      if (filters.categories && filters.categories.length > 0) {
        const categoryFilter = filters.categories.map(cat => `category eq '${cat}'`).join(' or ');
        filterParts.push(`(${categoryFilter})`);
      }

      if (filters.dateFrom) {
        filterParts.push(`uploadedDate ge ${filters.dateFrom.toISOString()}`);
      }

      if (filters.dateTo) {
        filterParts.push(`uploadedDate le ${filters.dateTo.toISOString()}`);
      }

      if (filters.author) {
        filterParts.push(`author eq '${filters.author}'`);
      }

      if (filters.projectScope) {
        filterParts.push(`projectScope eq ${filters.projectScope}`);
      }

      const filter = filterParts.join(' and ');

      logger.info(`🔎 Complex filter search: ${filter}`);

      const searchResults = await this.searchClient.search(query, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: topK,
              fields: ['embedding'],
            },
          ],
        },
        filter,
        top: topK,
        select: ['content', 'fileName', 'category', 'documentId', 'chunkIndex'],
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          content: result.document.content,
          fileName: result.document.fileName,
          category: result.document.category,
          score: result.score || 0,
          documentId: result.document.documentId,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error performing filtered search:', error);
      return [];
    }
  }

  /**
   * Build context string from search results for AI prompts
   */
  buildContext(searchResults: SearchResult[]): string {
    if (searchResults.length === 0) {
      return 'No relevant documents found.';
    }

    let context = '<relevant_documents>\n';
    
    searchResults.forEach((result, index) => {
      context += `\n<document index="${index + 1}" source="${result.fileName}" category="${result.category}" relevance_score="${result.score.toFixed(3)}">\n`;
      context += result.content;
      context += '\n</document>\n';
    });
    
    context += '\n</relevant_documents>';
    
    return context;
  }
}

// Singleton instance
export const ragEngine = new RAGEngine();


