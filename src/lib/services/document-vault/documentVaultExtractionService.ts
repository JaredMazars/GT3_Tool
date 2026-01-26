/**
 * Document Vault Extraction Service
 * Handles document upload, AI extraction, and field suggestion for vault documents
 */

import { generateObject } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { documentIntelligence } from '../documents/documentIntelligence';
import { z } from 'zod';
import type { VaultDocumentType, VaultDocumentScope } from '@/types/documentVault';

/**
 * Schema for AI-generated vault document field suggestions
 */
const VaultDocumentSuggestionsSchema = z.object({
  title: z.string().max(200).describe('A clear, descriptive title for the document'),
  description: z.string().max(1000).describe('A comprehensive description of the document purpose and contents'),
  documentType: z.enum(['POLICY', 'SOP', 'TEMPLATE', 'MARKETING', 'TRAINING', 'OTHER']).describe('The type of document based on its content and purpose'),
  suggestedCategory: z.string().nullable().describe('The single most appropriate category name from the provided list, or null if no good match'),
  documentVersion: z.string().nullable().describe('Internal version number found in the document (e.g., "1.0", "2.1", "Rev 3"), or null if not found'),
  scope: z.enum(['GLOBAL', 'SERVICE_LINE']).describe('Whether this document applies globally or to a specific service line'),
  serviceLine: z.string().nullable().describe('If SERVICE_LINE scope, the specific service line name (TAX, AUDIT, ACCOUNTING, ADVISORY, etc.)'),
  tags: z.array(z.string()).max(10).describe('Searchable tags for document discovery'),
  effectiveDate: z.string().nullable().describe('ISO date string (YYYY-MM-DD) when document becomes effective, or null'),
  expiryDate: z.string().nullable().describe('ISO date string (YYYY-MM-DD) when document expires or needs review, or null'),
  confidence: z.number().min(0).max(1).describe('Overall confidence score for the extraction (0-1)'),
  warnings: z.array(z.string()).describe('Any warnings or areas that may need manual review'),
});

export type VaultDocumentSuggestions = z.infer<typeof VaultDocumentSuggestionsSchema>;

export interface ProcessedDocumentResult {
  extractedText: string;
  suggestions: VaultDocumentSuggestions;
}

export interface CategoryInfo {
  id: number;
  name: string;
  description: string | null;
  documentType: string | null;
}

/**
 * Extract text content from document using Document Intelligence
 * Supports PDF and potentially other formats
 */
export async function extractContentFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    logger.info('Starting document text extraction with Document Intelligence', { mimeType });
    
    if (!documentIntelligence || typeof documentIntelligence.extractTextFromPDF !== 'function') {
      throw new Error('Document Intelligence service is not properly configured');
    }

    // Currently Document Intelligence primarily supports PDF
    // For other formats, we might need different extraction methods
    if (mimeType === 'application/pdf') {
      const extractedText = await documentIntelligence.extractTextFromPDF(buffer);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      logger.info(`Successfully extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    }

    // For other document types, we'd need additional extraction logic
    // For now, throw an error for unsupported types
    throw new Error(`Document type ${mimeType} extraction not yet implemented. PDF is currently supported.`);
    
  } catch (error) {
    logger.error('Document extraction failed:', error);
    throw new Error(`Failed to extract content from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate vault document field suggestions from extracted text using AI
 */
export async function generateVaultDocumentSuggestions(
  extractedText: string,
  fileName: string,
  categories: CategoryInfo[]
): Promise<VaultDocumentSuggestions> {
  try {
    logger.info('Generating vault document suggestions with AI', { 
      textLength: extractedText.length,
      fileName,
      categoryCount: categories.length 
    });

    // Build category context for AI - grouped by document type
    const categoriesByType: Record<string, CategoryInfo[]> = {};
    const uncategorized: CategoryInfo[] = [];

    categories.forEach(cat => {
      if (cat.documentType) {
        const docType = cat.documentType;
        if (!categoriesByType[docType]) {
          categoriesByType[docType] = [];
        }
        categoriesByType[docType]!.push(cat);
      } else {
        uncategorized.push(cat);
      }
    });

    // Build grouped category context
    let categoryContext = '';

    // Add typed categories
    const typeOrder = ['POLICY', 'SOP', 'TEMPLATE', 'MARKETING', 'TRAINING', 'OTHER'];
    typeOrder.forEach(type => {
      if (categoriesByType[type] && categoriesByType[type].length > 0) {
        categoryContext += `\n${type} Categories:\n`;
        categoriesByType[type].forEach(cat => {
          categoryContext += `  - ${cat.name}: ${cat.description || 'No description'}\n`;
        });
      }
    });

    // Add any other types not in the standard list
    Object.keys(categoriesByType).forEach(type => {
      if (!typeOrder.includes(type)) {
        categoryContext += `\n${type} Categories:\n`;
        categoriesByType[type]!.forEach(cat => {
          categoryContext += `  - ${cat.name}: ${cat.description || 'No description'}\n`;
        });
      }
    });

    // Add uncategorized (apply to all types)
    if (uncategorized.length > 0) {
      categoryContext += '\nGeneral Categories (all document types):\n';
      uncategorized.forEach(cat => {
        categoryContext += `  - ${cat.name}: ${cat.description || 'No description'}\n`;
      });
    }

    // Handle case where no categories exist
    if (!categoryContext.trim()) {
      categoryContext = 'No categories available - return null for suggestedCategory';
    }

    const prompt = `<task>
Analyze this document and suggest appropriate metadata fields for a corporate document vault system.
</task>

<document_context>
Filename: ${fileName}
</document_context>

<document_content>
${extractedText.substring(0, 50000)}${extractedText.length > 50000 ? '\n...(content truncated for processing)' : ''}
</document_content>

<available_categories>
${categoryContext}
</available_categories>

<instructions>
1. TITLE (max 200 chars):
   - Create a clear, professional title that describes the document
   - Use the filename as a hint but improve it for readability
   - Example: "pto_policy_2024.pdf" -> "Paid Time Off Policy 2024"

2. DESCRIPTION (max 1000 chars):
   - Write 2-3 paragraphs explaining what the document is and its purpose
   - Include who should use it and when it applies
   - Be specific about scope and key information

3. DOCUMENT TYPE:
   Choose the most appropriate type:
   - POLICY: Official company policies, rules, and regulations
   - SOP: Standard Operating Procedures with step-by-step instructions
   - TEMPLATE: Reusable document templates (proposals, contracts, forms)
   - MARKETING: Marketing materials, brand guidelines, presentations
   - TRAINING: Training materials, educational content, guides
   - OTHER: Documents that don't fit other categories

4. SUGGESTED CATEGORY:
   - Categories are grouped by document type in the available_categories section above
   - First determine the document type (POLICY, SOP, TEMPLATE, etc.)
   - Then select the ONE most appropriate category from that document type's section
   - You may also select from "General Categories" which apply to all document types
   - Return the category NAME (not ID) that best matches the document content and purpose
   - If no good matches exist in the detected type's categories, try General Categories
   - Return null if no relevant category found

5. SCOPE:
   - GLOBAL: Applies to entire firm (HR policies, IT guidelines, brand standards)
   - SERVICE_LINE: Specific to a service line (tax procedures, audit templates)

6. SERVICE LINE (if SERVICE_LINE scope):
   - Identify which service line: TAX, AUDIT, ACCOUNTING, ADVISORY
   - Look for service-specific terminology and context
   - Return null if GLOBAL scope

7. TAGS (3-10 tags):
   - Generate searchable tags as single words or short phrases
   - Include: document type, subject matter, key topics, department
   - Use lowercase with hyphens for multi-word tags
   - Examples: "hr-policy", "compliance", "template", "tax-form"

8. EFFECTIVE DATE:
   - Look for phrases: "Effective Date:", "Valid From:", "Issued:", "Effective as of"
   - Common locations: top of first page, header, introduction
   - Return as YYYY-MM-DD format
   - Return null if not found or unclear

9. EXPIRY DATE:
   - Look for phrases: "Expires:", "Valid Until:", "Review Date:", "Renewal Date:", "Supersedes on"
   - Return as YYYY-MM-DD format
   - Return null if not found or unclear

10. DOCUMENT VERSION:
   - Look for version indicators in the document content:
     - Common labels: "Version:", "Ver:", "V:", "Rev:", "Revision:", "Release:", "Draft:"
     - Common formats: "1.0", "2.1", "v3.2", "Rev 4", "Draft 1", "r5"
     - Common locations: header, footer, first page, title page, near effective date
   - Return the version string exactly as found (e.g., "1.0", "Rev 3", "Draft 2")
   - Return null if no clear version indicator is found
   - Do NOT make up or infer a version if not explicitly stated

11. CONFIDENCE SCORE (0-1):
    - High (0.8-1.0): Clear document type, obvious category match, explicit dates
    - Medium (0.5-0.79): Reasonable inferences but some ambiguity
    - Low (0-0.49): Unclear content, missing key information

12. WARNINGS:
    - Note if content is unclear or ambiguous
    - Flag if critical information is missing
    - Mention if document appears incomplete
    - Warn if dates are ambiguous or conflicts exist
</instructions>

<tone>
Professional and accurate. Focus on extracting precise information to help users organize their document vault.
</tone>`;

    const { object } = await generateObject({
      model: models.mini,
      schema: VaultDocumentSuggestionsSchema,
      system: `You are an expert document analyzer for professional services firms specializing in document classification and metadata extraction.

<guidelines>
- Analyze document content carefully and extract accurate metadata
- Match document characteristics to appropriate types and categories
- Be conservative with confidence scores - only high confidence when clearly evident
- Generate practical, searchable tags that aid document discovery
- Parse dates carefully - look for explicit date indicators
- Consider the professional services context (policies, procedures, client work)
- Return complete, valid responses in the specified schema format
</guidelines>`,
      prompt,
      ...getModelParams({ temperature: 0.3 }), // Lower temperature for more deterministic classification
    });

    if (!object) {
      throw new Error('Failed to generate vault document suggestions: No object returned');
    }

    const suggestions = object as VaultDocumentSuggestions;

    logger.info('Successfully generated vault document suggestions', { 
      titleLength: suggestions.title.length,
      documentType: suggestions.documentType,
      suggestedCategory: suggestions.suggestedCategory,
      documentVersion: suggestions.documentVersion,
      confidence: suggestions.confidence 
    });

    return suggestions;
  } catch (error) {
    logger.error('Failed to generate vault document suggestions:', error);
    throw new Error(`Failed to generate document field suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process uploaded document: extract text and generate field suggestions
 * This is the main entry point for document extraction workflow
 */
export async function processUploadedDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  categories: CategoryInfo[]
): Promise<ProcessedDocumentResult> {
  try {
    logger.info('Processing uploaded document for vault', { fileName, mimeType });

    // Step 1: Extract text from document
    const extractedText = await extractContentFromDocument(buffer, mimeType);

    // Step 2: Generate field suggestions from extracted text
    const suggestions = await generateVaultDocumentSuggestions(
      extractedText,
      fileName,
      categories
    );

    logger.info('Successfully processed document and generated suggestions', {
      fileName,
      confidence: suggestions.confidence,
    });

    return {
      extractedText,
      suggestions,
    };
  } catch (error) {
    logger.error('Failed to process uploaded document:', error);
    throw error;
  }
}
