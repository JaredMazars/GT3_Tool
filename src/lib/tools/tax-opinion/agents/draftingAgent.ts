import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

export interface OpinionSectionContent {
  title: string;
  content: string;
  citations: string[];
}

export class DraftingAgent {
  /**
   * Draft the Facts section of the opinion
   */
  static async draftFactsSection(facts: string): Promise<OpinionSectionContent> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.6 }),
        system: `You are an expert at drafting the Facts section of professional South African tax opinions.

<section_purpose>
The Facts section should:
- Present relevant facts clearly and objectively
- Organize information logically (chronological or thematic)
- Include all material facts for the tax analysis
- Avoid legal conclusions
- Use neutral, professional language
- Be comprehensive yet concise
</section_purpose>

<drafting_guidelines>
- Use numbered paragraphs for easy reference
- State facts as established, not alleged
- Include dates, amounts, and parties clearly
- Distinguish between established facts and assumptions
- Reference source documents where helpful
- Organize complex scenarios with subheadings
- Use defined terms for repeated concepts
</drafting_guidelines>

<output_format>
Provide a JSON response:
{
  "title": "FACTS",
  "content": "Professionally drafted facts section with numbered paragraphs...",
  "citations": ["Source document references if any"]
}
</output_format>`,
        prompt: `<established_facts>
${facts}
</established_facts>

<task>
Draft a professional Facts section for a South African tax opinion based on these established facts. 

Use numbered paragraphs. Present facts objectively and comprehensively. Organize logically. Use professional language appropriate for a formal tax opinion.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error drafting facts section:', error);
      throw new Error('Failed to draft facts section');
    }
  }

  /**
   * Draft the Issue section
   */
  static async draftIssueSection(
    taxIssue: string,
    facts: string
  ): Promise<OpinionSectionContent> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.5 }),
        system: `You are an expert at drafting the Issue section of professional South African tax opinions.

<section_purpose>
The Issue section should:
- State the precise tax question to be answered
- Frame the issue clearly and concisely
- Be specific rather than general
- Flow naturally from the facts
- Set up the analysis that follows
</section_purpose>

<drafting_guidelines>
- Begin with "The issue is whether..." or similar framing
- State one primary issue (or numbered sub-issues if multiple)
- Be specific about the tax consequences in question
- Reference relevant time periods or transactions
- Avoid assuming the answer
- Keep it concise - typically 1-3 paragraphs
</drafting_guidelines>

<output_format>
{
  "title": "ISSUE",
  "content": "Professional statement of the tax issue...",
  "citations": []
}
</output_format>`,
        prompt: `<tax_question>
${taxIssue}
</tax_question>

<facts>
${facts}
</facts>

<task>
Draft a professional Issue section that precisely frames the tax question to be addressed.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error drafting issue section:', error);
      throw new Error('Failed to draft issue section');
    }
  }

  /**
   * Draft the Law section
   */
  static async draftLawSection(
    relevantLaw: string[],
    precedents: string[]
  ): Promise<OpinionSectionContent> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.5 }),
        system: `You are an expert at drafting the Law section of professional South African tax opinions.

<section_purpose>
The Law section should:
- State the applicable statutory provisions
- Quote or paraphrase key law sections
- Discuss relevant case law and precedents
- Explain legal principles and tests
- Present law objectively before applying to facts
</section_purpose>

<drafting_guidelines>
- Organize by topic or by statute
- Quote key statutory language in full or in part
- Cite sections precisely (e.g., "Section 11(a) of the Income Tax Act")
- Summarize relevant case law with proper citations
- Explain the legal tests or principles that will be applied
- Use footnotes for full citations if appropriate
- Progress from general principles to specific provisions
</drafting_guidelines>

<south_african_citation_style>
- Statutes: "Section 11(a) of the Income Tax Act, No. 58 of 1962"
- Cases: "Case Name v Commissioner for SARS [year] ZASCA [number]"
- SARS publications: "SARS Interpretation Note [number]"
</south_african_citation_style>

<output_format>
{
  "title": "LAW",
  "content": "Professional exposition of applicable law with proper citations...",
  "citations": ["Full citations for reference"]
}
</output_format>`,
        prompt: `<relevant_law_sections>
${relevantLaw.join('\n')}
</relevant_law_sections>

<precedents>
${precedents.join('\n')}
</precedents>

<task>
Draft a professional Law section explaining the applicable South African tax law, including relevant statutes and case law. Quote key provisions and explain the legal principles that will be applied.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error drafting law section:', error);
      throw new Error('Failed to draft law section');
    }
  }

  /**
   * Draft the Application section
   */
  static async draftApplicationSection(
    facts: string,
    law: string,
    analysis: string
  ): Promise<OpinionSectionContent> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.6 }),
        system: `You are an expert at drafting the Application section of professional South African tax opinions.

<section_purpose>
The Application section should:
- Apply the law to the specific facts
- Work through each element or requirement systematically
- Address both supporting and challenging factors
- Engage with alternative interpretations
- Build toward a reasoned conclusion
- Show logical progression of analysis
</section_purpose>

<drafting_guidelines>
- Address each legal requirement or element in turn
- Reference both facts and law sections explicitly
- "On these facts, section X requires..."
- Acknowledge counter-arguments and address them
- Distinguish or analogize to precedents
- Use transitional phrases for flow
- Be thorough but avoid repetition
- Maintain objectivity while building the argument
</drafting_guidelines>

<analytical_approach>
For each element:
1. State the requirement from law
2. Identify relevant facts
3. Apply law to facts
4. Address potential objections
5. Reach intermediate conclusion
Then synthesize for overall conclusion
</analytical_approach>

<output_format>
{
  "title": "APPLICATION",
  "content": "Detailed application of law to facts with systematic analysis...",
  "citations": ["References to facts, law sections, and cases"]
}
</output_format>`,
        prompt: `<facts>
${facts}
</facts>

<applicable_law>
${law}
</applicable_law>

<analysis>
${analysis}
</analysis>

<task>
Draft a professional Application section that systematically applies the law to the facts. Work through each requirement methodically. Address alternative views. Build toward a well-reasoned conclusion.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error drafting application section:', error);
      throw new Error('Failed to draft application section');
    }
  }

  /**
   * Draft the Conclusion section
   */
  static async draftConclusionSection(
    issue: string,
    analysis: string,
    risks: string
  ): Promise<OpinionSectionContent> {
    try {
      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.5 }),
        system: `You are an expert at drafting the Conclusion section of professional South African tax opinions.

<section_purpose>
The Conclusion section should:
- Directly answer the stated issue
- State the conclusion clearly and concisely
- Summarize key reasoning briefly
- Include appropriate qualifications
- Address limitations or assumptions
- Provide practical guidance if relevant
</section_purpose>

<drafting_guidelines>
- Start with a clear answer to the issue
- "Based on the foregoing analysis, we conclude that..."
- Summarize 2-3 key reasons supporting the conclusion
- State confidence level if appropriate
- Include necessary caveats and limitations
- Note areas of uncertainty if material
- Keep it concise - typically 2-4 paragraphs
- End with any recommended actions
</drafting_guidelines>

<conclusion_levels>
- Strong: "We conclude that..." or "It is our opinion that..."
- Moderate: "It is more likely than not that..." or "We believe..."
- Weak: "There are reasonable grounds to argue..." or "It may be possible..."
</conclusion_levels>

<output_format>
{
  "title": "CONCLUSION",
  "content": "Professional conclusion with clear answer and appropriate qualifications...",
  "citations": []
}
</output_format>`,
        prompt: `<issue>
${issue}
</issue>

<analysis>
${analysis}
</analysis>

<risks>
${risks}
</risks>

<task>
Draft a professional Conclusion section that clearly answers the issue, summarizes key reasoning, and includes appropriate qualifications or caveats.
</task>`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error drafting conclusion section:', error);
      throw new Error('Failed to draft conclusion section');
    }
  }

  /**
   * Generate complete opinion draft from all components
   */
  static async draftCompleteOpinion(
    facts: string,
    issue: string,
    law: string[],
    precedents: string[],
    analysis: string,
    risks: string
  ): Promise<Array<{ sectionType: string; title: string; content: string; order: number }>> {
    try {
      // Draft each section
      const factsSection = await this.draftFactsSection(facts);
      const issueSection = await this.draftIssueSection(issue, facts);
      const lawSection = await this.draftLawSection(law, precedents);
      const applicationSection = await this.draftApplicationSection(
        facts,
        lawSection.content,
        analysis
      );
      const conclusionSection = await this.draftConclusionSection(
        issue,
        analysis,
        risks
      );

      // Return structured sections
      return [
        {
          sectionType: 'Facts',
          title: factsSection.title,
          content: factsSection.content,
          order: 1,
        },
        {
          sectionType: 'Issue',
          title: issueSection.title,
          content: issueSection.content,
          order: 2,
        },
        {
          sectionType: 'Law',
          title: lawSection.title,
          content: lawSection.content,
          order: 3,
        },
        {
          sectionType: 'Application',
          title: applicationSection.title,
          content: applicationSection.content,
          order: 4,
        },
        {
          sectionType: 'Conclusion',
          title: conclusionSection.title,
          content: conclusionSection.content,
          order: 5,
        },
      ];
    } catch (error) {
      logger.error('Error drafting complete opinion:', error);
      throw new Error('Failed to draft complete opinion');
    }
  }
}


