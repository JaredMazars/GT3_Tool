import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { ragEngine } from '@/lib/tools/tax-opinion/services/ragEngine';

export interface ResearchFindings {
  relevantLaw: string[];
  documentFindings: string;
  precedents: string[];
  additionalResearchNeeded: string[];
  citations: Array<{
    documentId: number;
    fileName: string;
    category: string;
    relevantExcerpt: string;
  }>;
}

export class ResearchAgent {
  /**
   * Research relevant documents and law for the tax issue
   */
  static async conductResearch(
    draftId: number,
    taxIssue: string,
    facts: string
  ): Promise<ResearchFindings> {
    try {
      // Perform semantic search on uploaded documents
      const searchResults = await ragEngine.semanticSearch(
        `${taxIssue}\n\n${facts}`,
        draftId,
        10
      );

      // Build context from retrieved documents
      const documentContext = ragEngine.buildContext(searchResults);

      // Generate research findings
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert South African tax researcher with deep knowledge of the Income Tax Act, case law, and SARS practice.

<role>
Conduct thorough legal research for tax opinions by:
- Identifying relevant tax law provisions
- Analyzing uploaded client documents
- Finding applicable precedents and cases
- Highlighting key facts from documentation
- Identifying additional research needs
</role>

<south_african_tax_law>
Focus on these key areas as relevant:
- Income Tax Act sections (especially s11-13, 23, 8, 1)
- Capital Gains Tax Act
- Tax Administration Act
- SARS Interpretation Notes and Binding Rulings
- Relevant court decisions (Supreme Court of Appeal, Tax Court)
- Double Taxation Agreements where applicable
- Transfer Pricing regulations
</south_african_tax_law>

<research_methodology>
1. Identify the precise tax law sections that apply
2. Extract relevant information from client documents
3. Find precedential cases with similar facts
4. Note any ambiguities or areas requiring deeper research
5. Consider alternative interpretations or positions
</research_methodology>

<output_format>
Provide your research in this JSON format:
{
  "relevantLaw": [
    "s11(a) - general deduction formula",
    "s23(g) - limitation on interest deductions",
    "..."
  ],
  "documentFindings": "Detailed analysis of what the uploaded documents reveal...",
  "precedents": [
    "Case Name citation - brief relevance",
    "..."
  ],
  "additionalResearchNeeded": [
    "Specific items requiring further research",
    "..."
  ]
}
</output_format>`,
        prompt: `<tax_issue>
${taxIssue}
</tax_issue>

<established_facts>
${facts}
</established_facts>

${documentContext}

<task>
Based on the tax issue, facts, and uploaded documents, conduct thorough research and identify:
1. All relevant South African tax law provisions
2. Key findings from the uploaded documents
3. Applicable precedents and cases
4. Areas requiring additional research

Be specific with section references and case citations. Quote relevant passages from documents when significant.
</task>`,
      });

      const findings = JSON.parse(text.trim());

      // Add citations from search results
      const citations = searchResults.map((result) => ({
        documentId: result.documentId,
        fileName: result.fileName,
        category: result.category,
        relevantExcerpt: result.content.substring(0, 300) + '...',
      }));

      return {
        ...findings,
        citations,
      };
    } catch (error) {
      logger.error('Error conducting research:', error);
      throw new Error('Failed to conduct research');
    }
  }

  /**
   * Search for specific information in documents
   */
  static async searchDocuments(
    draftId: number,
    query: string,
    category?: string
  ): Promise<{
    results: string;
    sources: Array<{
      fileName: string;
      category: string;
      excerpt: string;
    }>;
  }> {
    try {
      const searchResults = await ragEngine.semanticSearch(
        query,
        draftId,
        5,
        category
      );

      if (searchResults.length === 0) {
        return {
          results: 'No relevant information found in uploaded documents.',
          sources: [],
        };
      }

      const documentContext = ragEngine.buildContext(searchResults);

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert at analyzing and summarizing relevant information from tax documents.

<task>
Review the provided document excerpts and extract information relevant to the query. Provide a clear, concise summary with specific references to the source documents.
</task>`,
        prompt: `<query>
${query}
</query>

${documentContext}

Summarize the relevant information found in these documents, citing specific sources and page numbers where possible.`,
      });

      const sources = searchResults.map((result) => ({
        fileName: result.fileName,
        category: result.category,
        excerpt: result.content.substring(0, 200) + '...',
      }));

      return {
        results: text.trim(),
        sources,
      };
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  /**
   * Identify relevant tax law sections for an issue
   */
  static async identifyRelevantLaw(taxIssue: string): Promise<string[]> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert in South African tax law with comprehensive knowledge of the Income Tax Act and related legislation.

<task>
For a given tax issue, identify all potentially relevant sections of South African tax law.
</task>

<output_format>
Return a JSON array of strings, each containing a section reference and brief description:
["s11(a) - general deduction formula", "s23(g) - limitation on interest", ...]
</output_format>`,
        prompt: `<tax_issue>
${taxIssue}
</tax_issue>

Identify all potentially relevant South African tax law sections for this issue.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error identifying relevant law:', error);
      return [];
    }
  }

  /**
   * Find case law precedents
   */
  static async findPrecedents(taxIssue: string, facts: string): Promise<string[]> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert in South African tax case law with knowledge of significant court decisions.

<task>
Identify relevant case law precedents for a tax issue based on similar facts or legal principles.
</task>

<case_law_sources>
- Supreme Court of Appeal tax decisions
- High Court tax decisions
- Tax Court decisions
- SARS Binding Private Rulings (sanitized)
- International precedents where relevant
</case_law_sources>

<output_format>
Return a JSON array of strings with case citations and brief relevance:
["ITC 1234 (2020) - similar interest deduction issue", ...]

Include 3-5 most relevant cases. If no specific cases come to mind, suggest the type of precedent that would be relevant.
</output_format>`,
        prompt: `<tax_issue>
${taxIssue}
</tax_issue>

<facts>
${facts}
</facts>

Identify relevant South African tax case law precedents for this matter.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error finding precedents:', error);
      return [];
    }
  }
}


