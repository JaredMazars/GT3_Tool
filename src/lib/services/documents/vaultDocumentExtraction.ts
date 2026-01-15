/**
 * Vault Document Extraction Service
 * 
 * Uses Azure Document Intelligence and AI to extract and validate
 * metadata from vault documents including summary, key points, tags,
 * and dates. Adapts extraction based on document type.
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { documentIntelligence } from './documentIntelligence';
import { models } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

// Zod schema for extracted vault document metadata
const VaultDocumentMetadataSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  suggestedTags: z.array(z.string()),
  effectiveDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  confidence: z.object({
    summary: z.number().min(0).max(1),
    dates: z.number().min(0).max(1),
  }),
});

type VaultDocumentMetadata = z.infer<typeof VaultDocumentMetadataSchema>;

export interface ExtractedVaultDocumentData {
  isValid: boolean;
  errors: string[];
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
  effectiveDate: Date | null;
  expiryDate: Date | null;
  extractedText: string;
}

/**
 * Main function to extract metadata from vault document
 */
export async function extractVaultDocumentMetadata(
  buffer: Buffer,
  documentId: number,
  title: string,
  documentType: string,
  category: string
): Promise<ExtractedVaultDocumentData> {
  try {
    logger.info('Starting vault document extraction', { documentId, documentType });

    // 1. Extract text using Azure Document Intelligence
    logger.info('Extracting text with Document Intelligence', { documentId });
    const extractedText = await documentIntelligence.extractTextFromPDF(buffer);

    if (!extractedText || extractedText.length < 50) {
      throw new Error('Insufficient text extracted from document. The document may be image-based or corrupted.');
    }

    logger.info('Text extraction successful', { 
      documentId, 
      textLength: extractedText.length 
    });

    // 2. Analyze content with AI based on document type
    const metadata = await analyzeVaultDocumentContent(
      extractedText,
      {
        title,
        documentType,
        category,
      }
    );

    // 3. Validate extracted data
    const validation = validateVaultDocumentData(metadata);

    // 4. Parse dates
    const effectiveDate = metadata.effectiveDate ? new Date(metadata.effectiveDate) : null;
    const expiryDate = metadata.expiryDate ? new Date(metadata.expiryDate) : null;

    const result: ExtractedVaultDocumentData = {
      isValid: validation.isValid,
      errors: validation.errors,
      summary: metadata.summary,
      keyPoints: metadata.keyPoints,
      suggestedTags: metadata.suggestedTags,
      effectiveDate,
      expiryDate,
      extractedText: extractedText.substring(0, 50000), // Store first 50k chars
    };

    logger.info('Vault document extraction completed', {
      documentId,
      isValid: result.isValid,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    logger.error('Vault document extraction failed', { documentId, error });
    throw error;
  }
}

/**
 * Analyze vault document content using AI with type-specific prompts
 */
async function analyzeVaultDocumentContent(
  text: string,
  context: {
    title: string;
    documentType: string;
    category: string;
  }
): Promise<VaultDocumentMetadata> {
  
  // Build document type-specific instructions
  const typeInstructions = getTypeSpecificInstructions(context.documentType);

  const prompt = `You are analyzing a firm document from a document vault. Extract the following information:

DOCUMENT CONTEXT:
- Title: ${context.title}
- Type: ${context.documentType}
- Category: ${context.category}

DOCUMENT TEXT:
${text.substring(0, 50000)}

EXTRACTION REQUIREMENTS:

1. SUMMARY:
${typeInstructions.summary}

2. KEY POINTS:
${typeInstructions.keyPoints}

3. SUGGESTED TAGS:
   - Generate 3-7 relevant tags for searchability
   - Tags should be single words or short phrases
   - Include document type, subject matter, and key topics
   - Examples: "compliance", "hr-policy", "proposal-template", "brand-guidelines"

4. EFFECTIVE DATE:
   - Look for dates indicating when the document becomes effective
   - Common phrases: "Effective Date:", "Valid From:", "Issued:", date near top of document
   - Return as ISO date string (YYYY-MM-DD)
   - Return null if not found

5. EXPIRY DATE:
   - Look for dates indicating when the document expires or needs renewal
   - Common phrases: "Expires:", "Valid Until:", "Review Date:", "Renewal Date:"
   - Return as ISO date string (YYYY-MM-DD)
   - Return null if not found

6. CONFIDENCE SCORES:
   - Return confidence scores between 0 and 1
   - Higher confidence when multiple indicators are present
   - Only return data with confidence > 0.3

Return JSON with the extracted information. Be thorough and accurate.`;

  try {
    const result = await generateObject({
      model: models.nano,
      schema: VaultDocumentMetadataSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    logger.error('AI analysis failed for vault document', { error });
    throw new Error('Failed to analyze vault document content with AI');
  }
}

/**
 * Get type-specific extraction instructions
 */
function getTypeSpecificInstructions(documentType: string): {
  summary: string;
  keyPoints: string;
} {
  switch (documentType) {
    case 'POLICY':
      return {
        summary: `   - Generate a 2-3 paragraph executive summary
   - Focus on: purpose of policy, who it applies to, key requirements
   - Include scope and any important compliance requirements
   - Write in professional, formal tone`,
        keyPoints: `   - Extract 5-10 key requirements or obligations from the policy
   - Focus on actionable items and important rules
   - Include any penalties or consequences mentioned
   - List compliance requirements`
      };
    
    case 'SOP':
      return {
        summary: `   - Generate a 2-3 paragraph overview of the procedure
   - Focus on: what the procedure does, when to use it, who performs it
   - Include prerequisites and expected outcomes
   - Write in clear, instructional tone`,
        keyPoints: `   - Extract 5-10 key steps or important notes from the procedure
   - Focus on critical steps and decision points
   - Include any warnings or cautions
   - List required tools or resources`
      };
    
    case 'TEMPLATE':
      return {
        summary: `   - Generate a 1-2 paragraph description of the template
   - Focus on: purpose of template, when to use it, what it produces
   - Include any customization points or required fields
   - Write in helpful, practical tone`,
        keyPoints: `   - Extract 5-8 key sections or required fields in the template
   - Focus on what information is needed to complete it
   - Include any formatting or style guidelines
   - List any variable fields or placeholders`
      };
    
    case 'MARKETING':
      return {
        summary: `   - Generate a 1-2 paragraph overview of the marketing material
   - Focus on: target audience, key messages, intended use
   - Include any brand guidelines or usage restrictions
   - Write in engaging, marketing-focused tone`,
        keyPoints: `   - Extract 5-8 key messages or selling points
   - Focus on unique value propositions
   - Include target audience characteristics
   - List any usage guidelines or restrictions`
      };
    
    case 'TRAINING':
      return {
        summary: `   - Generate a 2-3 paragraph overview of the training material
   - Focus on: learning objectives, target audience, key topics covered
   - Include prerequisites and expected outcomes
   - Write in educational, supportive tone`,
        keyPoints: `   - Extract 5-10 key learning objectives or topics
   - Focus on what learners will be able to do after training
   - Include any important concepts or terminology
   - List practical applications or examples`
      };
    
    default: // OTHER
      return {
        summary: `   - Generate a 2-3 paragraph summary of the document
   - Focus on: main purpose, key information, intended audience
   - Include any important context or background
   - Write in clear, professional tone`,
        keyPoints: `   - Extract 5-10 key points from the document
   - Focus on most important information
   - Include any action items or recommendations
   - List key facts or data points`
      };
  }
}

/**
 * Validate extracted vault document data
 */
function validateVaultDocumentData(
  metadata: VaultDocumentMetadata
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate summary
  if (!metadata.summary || metadata.summary.length < 50) {
    errors.push('Summary is too short or missing');
  }

  // Validate key points
  if (metadata.keyPoints.length === 0) {
    errors.push('No key points identified in document');
  } else if (metadata.keyPoints.length < 3) {
    errors.push('Insufficient key points extracted (minimum 3 required)');
  }

  // Validate suggested tags
  if (metadata.suggestedTags.length === 0) {
    errors.push('No tags suggested for searchability');
  } else if (metadata.suggestedTags.length < 3) {
    errors.push('Insufficient tags suggested (minimum 3 required)');
  }

  // Validate dates (if provided)
  if (metadata.effectiveDate) {
    const effectiveDate = new Date(metadata.effectiveDate);
    if (effectiveDate > new Date()) {
      // Future effective dates are allowed
    }
    if (isNaN(effectiveDate.getTime())) {
      errors.push('Invalid effective date format');
    }
  }

  if (metadata.expiryDate) {
    const expiryDate = new Date(metadata.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid expiry date format');
    }
    // Check if expiry is before effective date
    if (metadata.effectiveDate) {
      const effectiveDate = new Date(metadata.effectiveDate);
      if (expiryDate < effectiveDate) {
        errors.push('Expiry date cannot be before effective date');
      }
    }
  }

  // Check confidence scores
  if (metadata.confidence.summary < 0.3) {
    errors.push('Low confidence in summary extraction - document may be unclear');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
