import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

export interface TaxAnalysis {
  mainIssues: string[];
  legalAnalysis: string;
  alternativePositions: Array<{
    position: string;
    strengths: string[];
    weaknesses: string[];
    likelihood: 'high' | 'medium' | 'low';
  }>;
  risks: Array<{
    risk: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  conclusion: string;
}

export class AnalysisAgent {
  /**
   * Perform comprehensive tax analysis
   */
  static async analyzeTaxPosition(
    facts: string,
    researchFindings: string,
    taxIssue: string
  ): Promise<TaxAnalysis> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.5 }),
        system: `You are an expert South African tax analyst providing rigorous legal analysis for tax opinions.

<role>
Analyze tax positions by:
- Identifying core legal issues
- Applying tax law to facts systematically
- Evaluating alternative interpretations
- Assessing risks and uncertainties
- Providing balanced, professional analysis
</role>

<analytical_framework>
1. Issue Identification: Define the precise tax questions
2. Applicable Law: State relevant provisions and principles
3. Application: Apply law to facts methodically
4. Alternative Views: Consider competing interpretations
5. Risk Assessment: Identify potential challenges
6. Conclusion: State the most supportable position
</analytical_framework>

<professional_standards>
- Be objective and balanced
- Acknowledge uncertainties and limitations
- Consider SARS's likely view
- Reference specific law sections and cases
- Distinguish strong vs weak arguments
- Flag areas requiring judgment calls
- Consider practical implications
</professional_standards>

<output_format>
Provide analysis in this JSON format:
{
  "mainIssues": [
    "Precise statement of tax issue 1",
    "Precise statement of tax issue 2"
  ],
  "legalAnalysis": "Comprehensive multi-paragraph analysis applying law to facts, discussing each issue systematically...",
  "alternativePositions": [
    {
      "position": "Description of position",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "likelihood": "high|medium|low"
    }
  ],
  "risks": [
    {
      "risk": "Description of risk",
      "severity": "high|medium|low",
      "mitigation": "How to mitigate"
    }
  ],
  "conclusion": "Clear statement of recommended tax position with qualification if needed"
}
</output_format>`,
        prompt: `<tax_issue>
${taxIssue}
</tax_issue>

<established_facts>
${facts}
</established_facts>

<research_findings>
${researchFindings}
</research_findings>

<task>
Provide a comprehensive tax analysis:

1. Identify the main tax issues clearly
2. Provide detailed legal analysis applying South African tax law to the facts
3. Evaluate alternative positions (taxpayer favorable, SARS view, middle ground)
4. Assess risks and their severity
5. Reach a clear conclusion on the most supportable position

Be thorough, balanced, and professional. Reference specific law sections. Acknowledge uncertainties.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error analyzing tax position:', error);
      throw new Error('Failed to analyze tax position');
    }
  }

  /**
   * Evaluate strength of a specific tax position
   */
  static async evaluatePosition(
    position: string,
    facts: string,
    law: string
  ): Promise<{
    strength: 'strong' | 'moderate' | 'weak';
    supportingFactors: string[];
    challengingFactors: string[];
    recommendation: string;
  }> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert at evaluating the strength of tax positions under South African law.

<evaluation_criteria>
Consider:
- Clarity of law
- Precedent support
- SARS published views
- Facts alignment with requirements
- Potential counter-arguments
- Practical defensibility
</evaluation_criteria>

<output_format>
{
  "strength": "strong|moderate|weak",
  "supportingFactors": ["Factor 1", "Factor 2"],
  "challengingFactors": ["Factor 1", "Factor 2"],
  "recommendation": "Clear recommendation"
}
</output_format>`,
        prompt: `<position>
${position}
</position>

<facts>
${facts}
</facts>

<applicable_law>
${law}
</applicable_law>

Evaluate the strength of this tax position.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error evaluating position:', error);
      throw new Error('Failed to evaluate position');
    }
  }

  /**
   * Identify potential SARS challenges
   */
  static async identifySARSChallenges(
    position: string,
    facts: string
  ): Promise<string[]> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.4 }),
        system: `You are an expert at anticipating SARS objections and challenges to tax positions.

<task>
Think like a SARS auditor and identify potential challenges or questions they might raise.
</task>

<sars_focus_areas>
- Substance over form
- Commercial rationale
- Anti-avoidance provisions (Part IIA, GAAR)
- Transfer pricing
- Documentation and evidence
- Consistency with prior positions
- International tax issues
</sars_focus_areas>

<output_format>
Return JSON array of strings, each describing a potential SARS challenge:
["Challenge 1", "Challenge 2", ...]
</output_format>`,
        prompt: `<taxpayer_position>
${position}
</taxpayer_position>

<facts>
${facts}
</facts>

Identify potential challenges SARS might raise to this position.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error identifying SARS challenges:', error);
      return [];
    }
  }

  /**
   * Assess documentation requirements
   */
  static async assessDocumentation(
    taxIssue: string,
    position: string
  ): Promise<{
    required: string[];
    recommended: string[];
    reasoning: string;
  }> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert in South African tax documentation and compliance requirements.

<task>
Identify documentation required to support a tax position, considering both legal requirements and practical defensibility.
</task>

<documentation_considerations>
- Statutory requirements (e.g., s31 for allowances)
- SARS practice notes and guidance
- Transfer pricing documentation
- Proof of payment/receipt
- Contemporaneous records
- Independent valuations where needed
- Board resolutions and commercial rationale
- Comparison to similar transactions
</documentation_considerations>

<output_format>
{
  "required": ["Legally required doc 1", "..."],
  "recommended": ["Advisable doc 1", "..."],
  "reasoning": "Explanation of why this documentation is important"
}
</output_format>`,
        prompt: `<tax_issue>
${taxIssue}
</tax_issue>

<position>
${position}
</position>

Identify required and recommended documentation to support this tax position.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error assessing documentation:', error);
      throw new Error('Failed to assess documentation requirements');
    }
  }
}


