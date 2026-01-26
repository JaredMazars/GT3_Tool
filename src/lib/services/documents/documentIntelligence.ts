/**
 * Azure Document Intelligence (Form Recognizer) integration
 * For extracting text and structure from PDF documents
 */

import { logger } from '../../utils/logger';

const docIntelligenceEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '';
const docIntelligenceKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '';

interface AnalyzeResult {
  content: string;
  pages: Array<{
    pageNumber: number;
    lines: Array<{
      content: string;
    }>;
  }>;
}

export class DocumentIntelligence {
  private endpoint: string;
  private apiKey: string;

  constructor() {
    this.endpoint = docIntelligenceEndpoint;
    this.apiKey = docIntelligenceKey;
  }

  /**
   * Check if Document Intelligence is configured
   */
  static isConfigured(): boolean {
    return !!docIntelligenceEndpoint && !!docIntelligenceKey;
  }

  /**
   * Extract text from document buffer (PDF or Word)
   * Automatically detects format and uses appropriate extraction method
   */
  async extractTextFromDocument(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.extractTextFromPDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.extractTextFromWord(buffer);
    }
    throw new Error(`Unsupported document type: ${mimeType}. Supported types: PDF, DOCX`);
  }

  /**
   * Extract text from Word document using mammoth library
   */
  private async extractTextFromWord(buffer: Buffer): Promise<string> {
    try {
      logger.info('Starting Word document text extraction with mammoth');
      
      // Dynamic import to avoid Next.js SSR issues
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text could be extracted from the Word document');
      }
      
      logger.info(`Successfully extracted ${result.value.length} characters from Word document`);
      
      return result.value;
    } catch (error) {
      logger.error('Error extracting text from Word document:', error);
      throw new Error(`Failed to extract content from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF buffer using Document Intelligence Read API
   */
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure Document Intelligence not configured');
    }

    try {
      // Start the analyze operation
      const analyzeUrl = `${this.endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
      
      logger.info('Starting Document Intelligence analysis...');

      const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
        body: new Uint8Array(buffer),
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Document Intelligence API error: ${analyzeResponse.status} - ${errorText}`);
      }

      // Get the operation location from headers
      const operationLocation = analyzeResponse.headers.get('operation-location');
      if (!operationLocation) {
        throw new Error('No operation-location header in response');
      }

      // Poll for results
      const result = await this.pollForResult(operationLocation);
      
      // Extract text from result
      const extractedText = this.extractContent(result);
      
      logger.info(`Successfully extracted ${extractedText.length} characters from PDF`);
      
      return extractedText;
    } catch (error) {
      logger.error('Error extracting text with Document Intelligence:', error);
      throw error;
    }
  }

  /**
   * Poll for analysis result
   */
  private async pollForResult(operationLocation: string, maxAttempts: number = 30): Promise<AnalyzeResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      await this.delay(2000); // Wait 2 seconds between polls
      
      const response = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get analysis result: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'succeeded') {
        return result.analyzeResult;
      } else if (result.status === 'failed') {
        throw new Error(`Document analysis failed: ${result.error?.message || 'Unknown error'}`);
      }
      
      // Status is still 'running' or 'notStarted', continue polling
      attempts++;
    }
    
    throw new Error('Document analysis timed out');
  }

  /**
   * Extract content from analyze result
   */
  private extractContent(result: AnalyzeResult): string {
    // Simply return the full content which includes all text
    if (result.content) {
      return result.content;
    }

    // Fallback: Concatenate text from all pages
    let text = '';
    if (result.pages) {
      for (const page of result.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            text += line.content + '\n';
          }
        }
      }
    }
    
    return text;
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const documentIntelligence = new DocumentIntelligence();


