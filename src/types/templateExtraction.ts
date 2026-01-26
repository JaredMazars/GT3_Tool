/**
 * Types for AI-powered template extraction from PDF/Word documents
 */

export interface PlaceholderSuggestion {
  placeholder: string;     // e.g., "clientName"
  currentValue: string;     // e.g., "ABC Corporation"
  context: string;          // Why detected as variable
}

export interface ExtractedTemplateBlock {
  sectionKey: string;       // e.g., "introduction", "scope_of_work"
  title: string;            // e.g., "Introduction"
  content: string;          // The actual markdown content
  order: number;            // Sequential order
  isRequired: boolean;      // Should appear in all generated docs
  isAiAdaptable: boolean;   // Can AI customize per task?
  suggestedPlaceholders: PlaceholderSuggestion[];
  applicableServiceLines?: string[];  // Optional: which service lines this section applies to
  applicableProjectTypes?: string[];  // Optional: which project types this section applies to
}

export interface ExtractedTemplate {
  suggestedName: string;
  suggestedDescription: string;
  suggestedType: 'ENGAGEMENT_LETTER' | 'PROPOSAL' | 'AGREEMENT';
  serviceLine: string | null;
  blocks: ExtractedTemplateBlock[];
  detectedPlaceholders: string[];  // All unique placeholders
  confidence: number;               // 0-1
  warnings: string[];
}

export interface ProcessedTemplateResult {
  extractedText: string;
  suggestions: ExtractedTemplate;
}

/**
 * Standard placeholders available for template generation
 * Sourced from templateGenerator.ts buildContextData()
 */
export const STANDARD_PLACEHOLDERS = [
  'clientName',
  'clientCode',
  'taskName',
  'taskType',
  'serviceLine',
  'taxYear',
  'taxPeriodStart',
  'taxPeriodEnd',
  'taskDescription',
  'projectDescription',
  'partnerName',
  'currentDate',
] as const;

export type StandardPlaceholder = typeof STANDARD_PLACEHOLDERS[number];

/**
 * Check if a placeholder is standard (known)
 */
export function isStandardPlaceholder(placeholder: string): placeholder is StandardPlaceholder {
  return STANDARD_PLACEHOLDERS.includes(placeholder as StandardPlaceholder);
}

/**
 * Extract all unique placeholders from content
 */
export function extractPlaceholdersFromContent(content: string): string[] {
  const placeholderRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1];
    if (placeholder && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }

  return placeholders;
}
