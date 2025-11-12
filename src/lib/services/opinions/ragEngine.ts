import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { embedMany } from 'ai';
import { models } from '../../ai/config';
import { logger } from '../../utils/logger';
import { downloadFile } from '../documents/blobStorage';
import { documentIntelligence, DocumentIntelligence } from '../documents/documentIntelligence';

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
      logger.warn('Azure Search not configured. RAG features will be disabled.');
      return;
    }
    
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
    fileType: string
  ): Promise<string> {
    try {
      // Download file from blob storage
      const buffer = await downloadFile(filePath);
      
      // Extract text from document
      const extractedText = await this.extractText(buffer, fileType);
      
      if (!this.searchClient) {
        logger.info('Azure Search not configured, skipping indexing');
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
        metadata: JSON.stringify({
          totalChunks: chunks.length,
          fileType,
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
      logger.info('Azure Search not configured, skipping semantic search');
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
      
      if (results.length > 0) {
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

