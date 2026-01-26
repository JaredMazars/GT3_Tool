/**
 * Template Extraction Service
 * AI-powered extraction of template sections and placeholders from PDF/Word documents
 */

import { generateObject } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { documentIntelligence } from '../documents/documentIntelligence';
import { z } from 'zod';
import type {
  ExtractedTemplate,
  ExtractedTemplateBlock,
  ProcessedTemplateResult,
  PlaceholderSuggestion,
} from '@/types/templateExtraction';

/**
 * Zod schema for AI-extracted template block
 */
const TemplateBlockSchema = z.object({
  sectionKey: z.string().describe('Unique key for section (lowercase, underscores)'),
  title: z.string().describe('Human-readable section title'),
  content: z.string().describe('Section content in markdown format'),
  order: z.number().describe('Sequential order in template'),
  isRequired: z.boolean().describe('Must appear in all generated documents'),
  isAiAdaptable: z.boolean().describe('Can be customized by AI per task'),
  suggestedPlaceholders: z.array(
    z.object({
      placeholder: z.string().describe('Placeholder name (e.g., clientName)'),
      currentValue: z.string().describe('Current value in document'),
      context: z.string().describe('Why detected as variable'),
    })
  ).describe('Variable content detected in this section'),
});

/**
 * Zod schema for complete template extraction result
 */
const TemplateExtractionSchema = z.object({
  suggestedName: z.string().max(200).describe('Suggested template name'),
  suggestedDescription: z.string().max(1000).describe('Suggested template description'),
  suggestedType: z.enum(['ENGAGEMENT_LETTER', 'PROPOSAL', 'AGREEMENT']).describe('Template type'),
  serviceLine: z.string().nullable().describe('Service line if specific (TAX, AUDIT, ACCOUNTING, ADVISORY)'),
  blocks: z.array(TemplateBlockSchema).describe('Extracted template sections'),
  detectedPlaceholders: z.array(z.string()).describe('All unique placeholders across sections'),
  confidence: z.number().min(0).max(1).describe('Overall extraction confidence'),
  warnings: z.array(z.string()).describe('Warnings or areas needing manual review'),
});

/**
 * Extract text content from template document (PDF or Word)
 */
export async function extractContentFromTemplate(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    logger.info('Starting template text extraction', { mimeType });
    
    if (!documentIntelligence) {
      throw new Error('Document Intelligence service is not properly configured');
    }

    const extractedText = await documentIntelligence.extractTextFromDocument(buffer, mimeType);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the template document');
    }

    logger.info(`Successfully extracted ${extractedText.length} characters from template`);
    return extractedText;
    
  } catch (error) {
    logger.error('Template extraction failed:', error);
    throw new Error(`Failed to extract content from template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze template structure using AI to identify sections and placeholders
 */
export async function analyzeTemplateStructure(
  extractedText: string,
  fileName: string
): Promise<ExtractedTemplate> {
  try {
    logger.info('Analyzing template structure with AI', { 
      textLength: extractedText.length,
      fileName,
    });

    const prompt = `<task>
Analyze this engagement letter template document and extract structured sections with placeholder detection.
</task>

<document_context>
Filename: ${fileName}
</document_context>

<document_content>
${extractedText.substring(0, 50000)}${extractedText.length > 50000 ? '\n...(content truncated for processing)' : ''}
</document_content>

<instructions>
1. TEMPLATE METADATA:
   - Suggest a clear, professional name for this template
   - Write a concise description (2-3 sentences) of its purpose
   - Identify type: ENGAGEMENT_LETTER (most common), PROPOSAL, or AGREEMENT
   - Detect if it's specific to a service line: TAX, AUDIT, ACCOUNTING, ADVISORY (or null if general)

2. SECTION IDENTIFICATION (Hybrid Approach):
   - Use SEMANTIC understanding to identify major sections:
     * Introduction / Letter Opening
     * Scope of Work / Services
     * Fees / Compensation
     * Terms & Conditions / Legal Terms
     * Signatures / Acceptance
     * Appendices / Schedules (if any)
   
   - Use DOCUMENT STRUCTURE as guides:
     * Headings (H1, H2, numbered sections, bold text)
     * Page breaks
     * Paragraph groupings
   
   - Combine both: semantic meaning takes priority, structure helps boundaries
   - Each section should be self-contained and meaningful
   - Aim for 4-8 major sections (fewer is better than too many)

3. SECTION METADATA:
   - sectionKey: lowercase with underscores (e.g., "introduction", "scope_of_work", "terms_and_conditions")
   - title: Human-readable title
   - content: Full section text in markdown format
   - order: Sequential numbering (0, 1, 2, ...)
   - isRequired: true for essential sections (intro, scope, T&C, signatures), false for optional
   - isAiAdaptable: true for sections that vary per task (scope, fees), false for standard text

4. PLACEHOLDER DETECTION (Dual Mode):
   
   a) PRESERVE existing placeholders:
      - Look for {{variable}} or {variable} patterns
      - Keep exact placeholder names as-is
      - Examples: {{clientName}}, {{currentDate}}, {{serviceLine}}
   
   b) DETECT new placeholders:
      - Identify variable content that changes per engagement:
        * Specific client names (e.g., "ABC Corporation Ltd")
        * Specific dates (e.g., "January 15, 2024")
        * Specific amounts (e.g., "$50,000")
        * Specific addresses
        * Specific partner names
        * Task/project names
      
      - Suggest placeholder names following camelCase convention:
        * Client name → clientName
        * Current date → currentDate
        * Service line → serviceLine
        * Task name → taskName
        * Partner name → partnerName
        * Tax year → taxYear
      
      - Provide context for WHY detected as variable
      - Example: "ABC Corporation Ltd" → {placeholder: "clientName", currentValue: "ABC Corporation Ltd", context: "Specific client company name"}
   
   c) STANDARD placeholders to recognize:
      - clientName, clientCode
      - taskName, taskType, taskDescription, projectDescription
      - serviceLine, taxYear, taxPeriodStart, taxPeriodEnd
      - partnerName
      - currentDate

5. CONTENT FORMAT:
   - Return section content as markdown
   - Preserve formatting: **bold**, *italic*, lists, tables
   - Replace detected variable content with {{placeholder}} syntax
   - Keep existing {{placeholders}} unchanged
   - Maintain paragraph structure and spacing

6. CONFIDENCE SCORE (0-1):
   - High (0.8-1.0): Clear structure, obvious sections, explicit variable patterns
   - Medium (0.5-0.79): Reasonable structure, some ambiguous boundaries
   - Low (0-0.49): Unclear structure, difficult to separate sections

7. WARNINGS:
   - Note if document structure is unclear
   - Flag if sections can't be cleanly separated
   - Warn if critical sections seem missing (e.g., no T&C, no scope)
   - Mention if many ambiguous placeholders detected
</instructions>

<tone>
Precise and analytical. Focus on clean section boundaries and accurate variable detection.
</tone>`;

    const { object } = await generateObject({
      model: models.nano,
      schema: TemplateExtractionSchema,
      system: `You are an expert template analyzer for professional services firms, specializing in engagement letter structure and variable content detection.

<guidelines>
- Identify clear, logical section boundaries based on semantic meaning and document structure
- Detect variable content that changes per engagement (clients, dates, amounts, names)
- Preserve existing placeholder patterns ({{variable}}) exactly as written
- Suggest new placeholders for detected variable content using camelCase convention
- Aim for 4-8 well-defined sections - fewer is better than too granular
- Be conservative with confidence scores - only high when structure is crystal clear
- Mark sections as AI-adaptable if they contain task-specific content (scope, fees)
- Mark sections as required if essential for valid engagement letter
- Return complete, valid responses in the specified schema format
</guidelines>`,
      prompt,
      ...getModelParams({ temperature: 0.3 }), // Lower temperature for more deterministic extraction
    });

    if (!object) {
      throw new Error('Failed to analyze template structure: No object returned');
    }

    const suggestions = object as unknown as ExtractedTemplate;

    logger.info('Successfully analyzed template structure', { 
      suggestedName: suggestions.suggestedName,
      sectionCount: suggestions.blocks.length,
      placeholderCount: suggestions.detectedPlaceholders.length,
      confidence: suggestions.confidence,
    });

    return suggestions;
  } catch (error) {
    logger.error('Failed to analyze template structure:', error);
    throw new Error(`Failed to analyze template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process uploaded template: extract text and analyze structure
 * Main entry point for template extraction workflow
 */
export async function processUploadedTemplate(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ProcessedTemplateResult> {
  try {
    logger.info('Processing uploaded template', { fileName, mimeType });

    // Step 1: Extract text from document
    const extractedText = await extractContentFromTemplate(buffer, mimeType);

    // Step 2: Analyze structure and detect placeholders
    const suggestions = await analyzeTemplateStructure(extractedText, fileName);

    logger.info('Successfully processed template', {
      fileName,
      confidence: suggestions.confidence,
      sectionCount: suggestions.blocks.length,
    });

    return {
      extractedText,
      suggestions,
    };
  } catch (error) {
    logger.error('Failed to process uploaded template:', error);
    throw error;
  }
}
