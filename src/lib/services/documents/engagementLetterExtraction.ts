/**
 * Engagement Letter Extraction Service
 * 
 * Uses Azure Document Intelligence and AI to extract and validate
 * metadata from engagement letter PDFs including signatures, dates,
 * partner information, and services covered.
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { documentIntelligence } from './documentIntelligence';
import { models } from '@/lib/ai/config';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { matchPartnerByName } from '@/lib/services/employees/partnerMatching';

// Zod schema for extracted engagement letter metadata
const EngagementLetterMetadataSchema = z.object({
  letterDate: z.string().nullable(), // ISO date string or null
  signingPartner: z.string().nullable(),
  servicesCovered: z.array(z.string()),
  hasPartnerSignature: z.boolean(),
  hasClientSignature: z.boolean(),
  hasTermsConditions: z.boolean(),
  hasTcPartnerSignature: z.boolean(),
  hasTcClientSignature: z.boolean(),
  confidence: z.object({
    letterDate: z.number().min(0).max(1),
    signatures: z.number().min(0).max(1),
    termsConditions: z.number().min(0).max(1),
  }),
});

type EngagementLetterMetadata = z.infer<typeof EngagementLetterMetadataSchema>;

export interface ExtractedEngagementLetterData {
  isValid: boolean;
  errors: string[];
  letterDate: Date | null;
  letterAge: number | null;
  signingPartner: string | null;
  partnerCode: string | null;
  services: string[];
  hasPartnerSignature: boolean;
  hasClientSignature: boolean;
  hasTermsConditions: boolean;
  hasTcPartnerSignature: boolean;
  hasTcClientSignature: boolean;
  extractedText?: string;
}

/**
 * Main function to extract metadata from engagement letter PDF
 */
export async function extractEngagementLetterMetadata(
  buffer: Buffer,
  taskId: number
): Promise<ExtractedEngagementLetterData> {
  try {
    logger.info('Starting engagement letter extraction', { taskId });

    // 1. Get task context for AI analysis
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskPartner: true,
        TaskPartnerName: true,
        ServLineCode: true,
        ServLineDesc: true,
        Client: {
          select: {
            clientNameFull: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // 2. Extract text using Azure Document Intelligence
    logger.info('Extracting text with Document Intelligence', { taskId });
    const extractedText = await documentIntelligence.extractTextFromPDF(buffer);

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Insufficient text extracted from PDF. The document may be image-based or corrupted.');
    }

    logger.info('Text extraction successful', { 
      taskId, 
      textLength: extractedText.length 
    });

    // 3. Analyze content with AI
    const metadata = await analyzeEngagementLetterContent(
      extractedText,
      {
        taskPartner: task.TaskPartnerName,
        taskPartnerCode: task.TaskPartner,
        clientName: task.Client?.clientNameFull || 'Unknown',
        serviceLine: task.ServLineDesc,
      }
    );

    // 4. Validate extracted data
    const validation = validateEngagementLetterData(metadata);

    // 5. Match partner code
    const partnerCode = await matchPartnerByName(
      metadata.signingPartner,
      task.TaskPartner
    );

    // 6. Calculate letter age
    const letterDate = metadata.letterDate ? new Date(metadata.letterDate) : null;
    const letterAge = letterDate 
      ? Math.floor((Date.now() - letterDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const result: ExtractedEngagementLetterData = {
      isValid: validation.isValid,
      errors: validation.errors,
      letterDate,
      letterAge,
      signingPartner: metadata.signingPartner,
      partnerCode,
      services: metadata.servicesCovered,
      hasPartnerSignature: metadata.hasPartnerSignature,
      hasClientSignature: metadata.hasClientSignature,
      hasTermsConditions: metadata.hasTermsConditions,
      hasTcPartnerSignature: metadata.hasTcPartnerSignature,
      hasTcClientSignature: metadata.hasTcClientSignature,
      extractedText: extractedText.substring(0, 50000), // Store first 50k chars
    };

    logger.info('Engagement letter extraction completed', {
      taskId,
      isValid: result.isValid,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    logger.error('Engagement letter extraction failed', { taskId, error });
    throw error;
  }
}

/**
 * Analyze engagement letter content using AI
 */
async function analyzeEngagementLetterContent(
  text: string,
  context: {
    taskPartner: string;
    taskPartnerCode: string;
    clientName: string;
    serviceLine: string;
  }
): Promise<EngagementLetterMetadata> {
  const prompt = `You are analyzing an engagement letter document. Extract the following information:

DOCUMENT TEXT:
${text.substring(0, 50000)} 

TASK CONTEXT:
- Task Partner: ${context.taskPartner} (${context.taskPartnerCode})
- Client: ${context.clientName}
- Service Line: ${context.serviceLine}

EXTRACTION REQUIREMENTS:

1. LETTER DATE:
   - Look for date near "Engagement Letter" heading or at top of document
   - Common formats: "15 January 2024", "2024-01-15", "January 15, 2024"
   - Return as ISO date string (YYYY-MM-DD)
   - Look for phrases like "Date:", "Dated:", or dates in signature section

2. SIGNING PARTNER:
   - Look for partner name NEAR any signature line or at the end of the main letter
   - May appear as typed text above/below signature line (e.g., typed name "Walter Blake" near signature)
   - Look for: "Partner:", "Signed by:", "For and on behalf of", "pp", "Yours faithfully/sincerely" followed by name
   - Also check for partner name in signature blocks, even without explicit labels
   - Cross-check against task partner: ${context.taskPartner} but accept variations (initials, full name, etc.)
   - Be GENEROUS: If partner name appears near end of main letter, assume it's the signing partner

3. SERVICES COVERED:
   - Extract list of services mentioned in scope section
   - Common terms: "tax compliance", "audit", "advisory", "accounting", "consulting", "assurance"
   - Look for "scope of work", "services", "our engagement", "we will" sections
   - Return as array of distinct services (avoid duplicates)

4. SIGNATURES ON MAIN ENGAGEMENT LETTER:
   - Partner Signature (Main Letter): Look for ANY of: typed partner name near "Yours faithfully/sincerely", signature line, "signed", "pp", partner name at end of letter, "for Forvis Mazars" followed by name
   - Client Signature (Main Letter): Look for: "acknowledged", "accepted", "client signature", "signed by client", signature line with client name, or ANY signature indicator on page 2-3 of main letter
   - Be GENEROUS: If you see a partner/client name near end of their respective letter sections, assume signature is present
   
5. TERMS & CONDITIONS SECTION (CRITICAL):
   - Look for heading: "Standard Terms and Conditions", "Terms and Conditions", "Terms of Engagement", "T&C", "General Terms"
   - Must be SEPARATE section (usually starts on a new page after main letter)
   - Contains multiple numbered/lettered clauses or paragraphs (typically 5+ clauses)
   - Often has different formatting (smaller font, numbered sections)
   - The T&C section may or may not have its own signature block (varies by document)
   - Look for section breaks, page breaks, or new headings indicating a distinct section
   
6. TERMS & CONDITIONS SIGNATURES:
   - Partner Signature (T&C): OPTIONAL - Only mark as true if you see partner signature indicators specifically in the T&C section (keywords "signed", "pp", partner name, "for Forvis Mazars")
   - Client Signature (T&C): REQUIRED - Look for client acceptance at END of T&C section (last page) - keywords "acknowledged", "accepted", "agreed to terms", signature line, client name
   - Typical format: Only client signs at end of T&C (3 total signatures in document: partner on main letter, client on main letter, client on T&C)
   
   Note: Be generous in detecting signatures - if client name appears at end of T&C section, assume signature present

7. CONFIDENCE SCORES:
   - Return confidence scores between 0 and 1
   - Only return data with confidence > 0.5
   - Higher confidence when multiple indicators present
   - For T&C section detection, require clear section heading + substantial content (multiple clauses/paragraphs)

Return JSON with the extracted information. Be thorough but accurate.

IMPORTANT: Set hasTermsConditions to TRUE only if there is a clear, separate Terms & Conditions section with:
- A distinct heading/title (e.g., "Standard Terms and Conditions")
- Multiple paragraphs of terms (typically 5+ numbered clauses)
- Appears on separate pages after main letter

Do not set it to TRUE just because terms are mentioned in the main letter.

DETECTION STRATEGY: Be GENEROUS with signature detection but ACCURATE with content extraction. If you see names near signature lines or end of sections, assume they represent signatures. Focus on finding the actual content (dates, partner names, services, T&C section) accurately.`;

  try {
    const result = await generateObject({
      model: models.nano,
      schema: EngagementLetterMetadataSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    logger.error('AI analysis failed for engagement letter', { error });
    throw new Error('Failed to analyze engagement letter content with AI');
  }
}

/**
 * Validate extracted engagement letter data
 */
function validateEngagementLetterData(
  metadata: EngagementLetterMetadata
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate letter date
  if (!metadata.letterDate) {
    errors.push('Letter date not found in document');
  } else {
    const date = new Date(metadata.letterDate);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    if (date < fiveYearsAgo) {
      errors.push('Letter date is more than 5 years old');
    }
    
    if (date > new Date()) {
      errors.push('Letter date is in the future');
    }
  }

  // Validate signing partner
  if (!metadata.signingPartner) {
    errors.push('Signing partner name not identified');
  }

  // Validate services covered
  if (metadata.servicesCovered.length === 0) {
    errors.push('No services identified in engagement letter');
  }

  // Validate signatures on main engagement letter
  if (!metadata.hasPartnerSignature) {
    errors.push('Partner signature not found on engagement letter');
  }

  if (!metadata.hasClientSignature) {
    errors.push('Client signature not found on engagement letter');
  }

  // Validate Terms & Conditions section
  if (!metadata.hasTermsConditions) {
    errors.push('Separate Terms & Conditions section with its own pages not found in document');
  } else {
    // Only validate client T&C signature (partner T&C signature is optional)
    if (!metadata.hasTcClientSignature) {
      errors.push('Client signature not found on Terms & Conditions section');
    }
  }

  // Check confidence scores
  if (metadata.confidence.signatures < 0.5) {
    errors.push('Low confidence in signature detection - please verify document quality');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

