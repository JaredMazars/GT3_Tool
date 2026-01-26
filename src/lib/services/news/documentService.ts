/**
 * News Bulletin Document Service
 * Handles document upload, AI extraction, and management for news bulletins
 */

import { generateObject } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import {
  uploadNewsBulletinDocument as uploadToBlob,
  deleteNewsBulletinDocument as deleteFromBlob,
  initNewsBulletinsStorage,
} from '../documents/blobStorage';
import { documentIntelligence } from '../documents/documentIntelligence';
import { z } from 'zod';

/**
 * Schema for AI-generated bulletin suggestions
 */
const BulletinSuggestionsSchema = z.object({
  title: z.string().describe('A concise, compelling title for the news bulletin (max 255 characters)'),
  summary: z.string().describe('A brief summary of the key points (max 500 characters)'),
  body: z.string().describe('The full bulletin content with detailed information'),
  category: z.enum([
    'ANNOUNCEMENT',
    'POLICY_UPDATE',
    'EVENT',
    'ACHIEVEMENT',
    'REMINDER',
    'CLIENT_WIN',
    'MARKET_UPDATE',
    'INDUSTRY_NEWS',
    'PARTNERSHIP',
    'HIRING',
  ]).describe('The most appropriate category for this bulletin'),
  confidence: z.number().min(0).max(1).describe('Confidence score for the extraction (0-1)'),
  warnings: z.array(z.string()).describe('Any warnings or areas that may need manual review'),
});

export type BulletinSuggestions = z.infer<typeof BulletinSuggestionsSchema>;

export interface UploadDocumentResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: Date;
}

/**
 * Initialize news bulletin document storage
 */
export async function initDocumentStorage(): Promise<void> {
  await initNewsBulletinsStorage();
}

/**
 * Extract text content from PDF using Document Intelligence
 */
export async function extractContentFromPDF(buffer: Buffer): Promise<string> {
  try {
    logger.info('Starting PDF text extraction with Document Intelligence');
    
    if (!documentIntelligence || typeof documentIntelligence.extractTextFromPDF !== 'function') {
      throw new Error('Document Intelligence service is not properly configured');
    }

    const extractedText = await documentIntelligence.extractTextFromPDF(buffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }

    logger.info(`Successfully extracted ${extractedText.length} characters from PDF`);
    return extractedText;
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    throw new Error(`Failed to extract content from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate bulletin suggestions from extracted text using AI
 */
export async function generateBulletinSuggestions(extractedText: string): Promise<BulletinSuggestions> {
  try {
    logger.info('Generating bulletin suggestions with AI', { textLength: extractedText.length });

    const prompt = `<task>
Analyze this document content and generate a professional news bulletin for a professional services firm.
</task>

<document_content>
${extractedText.substring(0, 15000)}${extractedText.length > 15000 ? '\n...(content truncated for processing)' : ''}
</document_content>

<instructions>
1. Create a compelling, concise title (max 255 characters) that captures the essence of the content
2. Write a brief summary (max 500 characters) highlighting the key points
3. Generate a full bulletin body with 2-4 well-structured paragraphs that:
   - Expands on the summary with relevant details
   - Uses professional, clear language appropriate for corporate communications
   - Maintains an informative and engaging tone
   - Includes any important dates, numbers, or actionable information
   - Ends with a forward-looking statement or call to action if appropriate

4. Identify the most appropriate category from:
   - ANNOUNCEMENT: General company announcements
   - POLICY_UPDATE: Policy changes or updates
   - EVENT: Upcoming or past events
   - ACHIEVEMENT: Company or team achievements
   - REMINDER: Important reminders
   - CLIENT_WIN: New client acquisitions or wins
   - MARKET_UPDATE: Market or industry updates
   - INDUSTRY_NEWS: Relevant industry news
   - PARTNERSHIP: New partnerships or collaborations
   - HIRING: Recruitment or new hires

5. Provide a confidence score (0-1) based on:
   - Clarity of the source content
   - Completeness of information
   - Ability to extract all necessary details

6. List any warnings if:
   - Source content is unclear or ambiguous
   - Important information may be missing
   - Manual review is recommended
   - Content doesn't fit standard bulletin patterns
</instructions>

<tone>
Professional, informative, and appropriate for corporate internal communications.
</tone>`;

    const { object } = await generateObject({
      model: models.mini,
      schema: BulletinSuggestionsSchema,
      system: `You are an expert corporate communications writer specializing in professional services firm bulletins.

<guidelines>
- Write in a professional, clear style appropriate for internal company communications
- Be concise while ensuring all important information is included
- Use active voice and engaging language
- Ensure accuracy and preserve any specific numbers, dates, or facts from the source
- Structure content logically with clear paragraphs
- Always return valid, complete responses in the specified schema format
</guidelines>`,
      prompt,
      ...getModelParams({ temperature: 0.7 }),
    });

    if (!object) {
      throw new Error('Failed to generate bulletin suggestions: No object returned');
    }

    const suggestions = object as BulletinSuggestions;

    logger.info('Successfully generated bulletin suggestions', { 
      titleLength: suggestions.title.length,
      confidence: suggestions.confidence 
    });

    return suggestions;
  } catch (error) {
    logger.error('Failed to generate bulletin suggestions:', error);
    throw new Error(`Failed to generate bulletin content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload bulletin document to blob storage
 */
export async function uploadBulletinDocument(
  buffer: Buffer,
  fileName: string,
  bulletinId?: number
): Promise<UploadDocumentResult> {
  try {
    logger.info('Uploading bulletin document', { fileName, bulletinId });

    const filePath = await uploadToBlob(buffer, fileName, bulletinId);
    const fileSize = buffer.length;
    const uploadedAt = new Date();

    logger.info('Successfully uploaded bulletin document', { filePath, fileSize });

    return {
      fileName,
      filePath,
      fileSize,
      uploadedAt,
    };
  } catch (error) {
    logger.error('Failed to upload bulletin document:', error);
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete bulletin document from blob storage
 */
export async function deleteBulletinDocument(filePath: string): Promise<void> {
  try {
    logger.info('Deleting bulletin document', { filePath });
    await deleteFromBlob(filePath);
    logger.info('Successfully deleted bulletin document', { filePath });
  } catch (error) {
    logger.error('Failed to delete bulletin document:', error);
    // Don't throw - document deletion failure shouldn't block other operations
    logger.warn('Continuing despite deletion failure');
  }
}

/**
 * Process uploaded PDF: extract text and generate bulletin suggestions
 */
export async function processUploadedPDF(buffer: Buffer): Promise<{
  extractedText: string;
  suggestions: BulletinSuggestions;
}> {
  try {
    logger.info('Processing uploaded PDF for bulletin generation');

    // Step 1: Extract text from PDF
    const extractedText = await extractContentFromPDF(buffer);

    // Step 2: Generate bulletin suggestions from extracted text
    const suggestions = await generateBulletinSuggestions(extractedText);

    logger.info('Successfully processed PDF and generated suggestions');

    return {
      extractedText,
      suggestions,
    };
  } catch (error) {
    logger.error('Failed to process uploaded PDF:', error);
    throw error;
  }
}
