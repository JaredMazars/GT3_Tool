import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

export interface ReviewFeedback {
  overallScore: number;
  completeness: {
    score: number;
    missingElements: string[];
  };
  coherence: {
    score: number;
    issues: string[];
  };
  citations: {
    score: number;
    issues: string[];
  };
  logic: {
    score: number;
    gaps: string[];
  };
  recommendations: string[];
  readyForClient: boolean;
}

export class ReviewAgent {
  /**
   * Review complete opinion draft for quality and completeness
   */
  static async reviewOpinion(
    sections: Array<{ sectionType: string; title: string; content: string }>
  ): Promise<ReviewFeedback> {
    try {
      const opinionText = sections
        .map((s) => `${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert senior tax reviewer evaluating opinion quality before client delivery.

<review_criteria>
Evaluate across these dimensions:

1. COMPLETENESS (0-100)
   - All necessary sections present
   - Facts sufficiently detailed
   - Law adequately explained
   - Analysis thorough
   - Conclusion clear

2. COHERENCE (0-100)
   - Logical flow between sections
   - Consistent terminology
   - Clear writing
   - Appropriate structure

3. CITATIONS (0-100)
   - Law sections properly cited
   - Case law referenced correctly
   - Source documents acknowledged
   - Citations formatted properly

4. LOGIC (0-100)
   - Analysis follows from law and facts
   - Arguments well-supported
   - Counter-arguments addressed
   - Reasoning sound
   - No logical gaps

5. OVERALL READINESS (0-100)
   - Professional tone and language
   - Suitable for client delivery
   - Appropriate qualifications
   - Risk disclosures adequate
</review_criteria>

<output_format>
{
  "overallScore": <0-100>,
  "completeness": {
    "score": <0-100>,
    "missingElements": ["Missing element 1", "..."]
  },
  "coherence": {
    "score": <0-100>,
    "issues": ["Coherence issue 1", "..."]
  },
  "citations": {
    "score": <0-100>,
    "issues": ["Citation issue 1", "..."]
  },
  "logic": {
    "score": <0-100>,
    "gaps": ["Logical gap 1", "..."]
  },
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "..."
  ],
  "readyForClient": <true/false>
}

Set readyForClient to true only if overallScore >= 80 and no critical issues.
</output_format>`,
        prompt: `<opinion_draft>
${opinionText}
</opinion_draft>

<task>
Review this tax opinion draft comprehensively. Evaluate completeness, coherence, citations, and logic. Provide specific, actionable feedback for improvement.

Be thorough but fair in your assessment. Identify both strengths and areas for improvement.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error reviewing opinion:', error);
      throw new Error('Failed to review opinion');
    }
  }

  /**
   * Review a specific section
   */
  static async reviewSection(
    sectionType: string,
    content: string,
    context: string
  ): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  }> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.4 }),
        system: `You are an expert reviewer evaluating individual sections of tax opinions.

<task>
Review the provided section for quality, completeness, and appropriateness. Consider the section's purpose and how well it fulfills that purpose.
</task>

<section_standards>
FACTS:
- All material facts present
- Objective presentation
- Logical organization
- Proper level of detail

ISSUE:
- Precise framing
- Clear statement
- Flows from facts

LAW:
- Relevant provisions cited
- Key language quoted
- Proper citations
- Clear explanation

APPLICATION:
- Systematic analysis
- Facts applied to law
- Counter-arguments addressed
- Well-reasoned

CONCLUSION:
- Directly answers issue
- Clear statement
- Appropriate qualifications
- Practical guidance
</section_standards>

<output_format>
{
  "score": <0-100>,
  "strengths": ["Strength 1", "..."],
  "improvements": ["Area to improve 1", "..."],
  "suggestions": ["Specific suggestion 1", "..."]
}
</output_format>`,
        prompt: `<section_type>
${sectionType}
</section_type>

<content>
${content}
</content>

<context>
${context}
</context>

<task>
Review this ${sectionType} section. Evaluate its quality and provide specific feedback.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error reviewing section:', error);
      throw new Error('Failed to review section');
    }
  }

  /**
   * Check citation accuracy and completeness
   */
  static async checkCitations(content: string): Promise<{
    citationsFound: string[];
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert at reviewing legal citations in South African tax opinions.

<citation_standards>
- Statutes: Full reference on first use, short form thereafter
- Cases: Proper court and year citation
- SARS publications: Full title and number
- Internal cross-references: Correct paragraph numbers
</citation_standards>

<output_format>
{
  "citationsFound": ["Citation 1", "Citation 2"],
  "issues": ["Issue 1", "Issue 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}
</output_format>`,
        prompt: `<content>
${content}
</content>

Review all citations in this content for accuracy and completeness.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error checking citations:', error);
      return {
        citationsFound: [],
        issues: [],
        suggestions: [],
      };
    }
  }

  /**
   * Suggest improvements for specific content
   */
  static async suggestImprovements(
    content: string,
    issueType: 'clarity' | 'completeness' | 'logic' | 'tone'
  ): Promise<string[]> {
    try {
      const prompts = {
        clarity: 'Suggest ways to make this content clearer and more understandable.',
        completeness: 'Identify what information is missing or should be added.',
        logic: 'Identify logical gaps or weaknesses in the reasoning.',
        tone: 'Suggest improvements to make the tone more professional and appropriate.',
      };

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.4 }),
        system: `You are an expert editor improving tax opinion quality.

<task>
Provide specific, actionable suggestions for improvement. Be constructive and practical.
</task>

<output_format>
Return a JSON array of strings:
["Suggestion 1", "Suggestion 2", ...]
</output_format>`,
        prompt: `<content>
${content}
</content>

${prompts[issueType]}`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error suggesting improvements:', error);
      return [];
    }
  }

  /**
   * Perform final quality check before export
   */
  static async finalQualityCheck(
    opinionText: string
  ): Promise<{
    passesCheck: boolean;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are performing a final quality check on a tax opinion before client delivery.

<critical_checks>
Critical issues that prevent delivery:
- Missing essential sections
- Logical contradictions
- Unsupported conclusions
- Improper legal citations
- Unprofessional language
- Material errors

Warnings (can proceed with caution):
- Minor formatting issues
- Optional improvements
- Additional context that could help
</critical_checks>

<output_format>
{
  "passesCheck": <true/false>,
  "criticalIssues": ["Critical issue 1", "..."],
  "warnings": ["Warning 1", "..."],
  "recommendations": ["Recommendation 1", "..."]
}

Set passesCheck to false only if critical issues exist.
</output_format>`,
        prompt: `<opinion>
${opinionText}
</opinion>

Perform a final quality check. Identify any critical issues that prevent delivery and any warnings or recommendations.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error in final quality check:', error);
      throw new Error('Failed to perform final quality check');
    }
  }
}


