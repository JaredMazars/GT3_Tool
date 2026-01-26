/**
 * Client and Engagement Acceptance Question Definitions
 * Separated into Client-level and Engagement-level assessments
 */

export type QuestionnaireType =
  | 'CLIENT_ACCEPTANCE' // New client risk assessment (client-level)
  | 'ENGAGEMENT_ACCEPTANCE_FULL' // Engagement-specific acceptance (formerly ACCEPTANCE_FULL)
  | 'ENGAGEMENT_ACCEPTANCE_LITE' // Engagement-specific acceptance lite (formerly ACCEPTANCE_LITE)
  | 'CONTINUANCE_FULL' // Client continuance (annual review)
  | 'CONTINUANCE_LITE' // Client continuance lite
  // Legacy types (for backwards compatibility)
  | 'ACCEPTANCE_FULL' 
  | 'ACCEPTANCE_LITE';

export type FieldType = 'RADIO' | 'TEXTAREA' | 'SELECT' | 'FILE_UPLOAD' | 'BUTTON' | 'PLACEHOLDER';

export interface AcceptanceQuestionDef {
  questionKey: string;
  sectionKey: string;
  questionText: string;
  description?: string;
  fieldType: FieldType;
  options?: string[];
  required: boolean;
  order: number;
  riskWeight: number; // 0-10, higher means more risky
  highRiskAnswers?: string[]; // Answers that indicate high risk (e.g., ["Yes"])
  conditionalDisplay?: {
    // Show this question only if another question has specific answer
    dependsOn: string; // questionKey
    requiredAnswer: string;
  };
  allowComment?: boolean; // Show comment textarea when certain answer selected
}

export interface QuestionSection {
  key: string;
  title: string;
  description?: string;
  questions: AcceptanceQuestionDef[];
}

// =============================================================================
// CLIENT_ACCEPTANCE - Client-Level Risk Assessment
// Simplified questionnaire focusing on client entity risks (not engagement-specific)
// Completed once for the client, or when substantial risk changes
// =============================================================================

const CLIENT_ACCEPTANCE_BACKGROUND_SECTION: QuestionSection = {
  key: 'client_background',
  title: 'Client Background and Ownership',
  description: 'Basic information about the client entity and ownership structure',
  questions: [
    {
      questionKey: 'Q1ClientBackground',
      sectionKey: 'client_background',
      questionText: 'What is the nature of the client\'s business and industry?',
      description: 'Provide a brief description of the client\'s primary business activities and industry sector',
      fieldType: 'TEXTAREA',
      required: true,
      order: 1,
      riskWeight: 2,
    },
    {
      questionKey: 'Q2ClientBackground',
      sectionKey: 'client_background',
      questionText: 'Is the client\'s ownership structure clear and transparent?',
      description: 'Complex ownership structures, offshore entities, or lack of transparency may indicate higher risk',
      fieldType: 'RADIO',
      options: ['Yes', 'No', 'Partially'],
      required: true,
      order: 2,
      riskWeight: 6,
      highRiskAnswers: ['No', 'Partially'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ClientBackground',
      sectionKey: 'client_background',
      questionText: 'Has the client been operating for more than 3 years?',
      description: 'Newer clients may have higher business risk',
      fieldType: 'RADIO',
      options: ['Yes', 'No'],
      required: true,
      order: 3,
      riskWeight: 3,
      highRiskAnswers: ['No'],
    },
  ],
};

const CLIENT_ACCEPTANCE_FINANCIAL_SECTION: QuestionSection = {
  key: 'client_financial',
  title: 'Financial Stability and Risk',
  description: 'Assessment of the client\'s financial position and stability',
  questions: [
    {
      questionKey: 'Q1ClientFinancial',
      sectionKey: 'client_financial',
      questionText: 'Is the client experiencing financial difficulties or insolvency concerns?',
      description: 'Financial distress may impact our ability to collect fees and increase engagement risk',
      fieldType: 'RADIO',
      options: ['No', 'Some concerns', 'Significant concerns'],
      required: true,
      order: 1,
      riskWeight: 8,
      highRiskAnswers: ['Significant concerns'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ClientFinancial',
      sectionKey: 'client_financial',
      questionText: 'Does the client have a history of late payments or fee disputes with service providers?',
      description: 'Payment history may indicate potential collection issues',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'Unknown'],
      required: true,
      order: 2,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ClientFinancial',
      sectionKey: 'client_financial',
      questionText: 'Is the client\'s industry subject to significant economic volatility or decline?',
      description: 'Industry conditions may impact client stability and risk',
      fieldType: 'RADIO',
      options: ['No', 'Moderate volatility', 'High volatility'],
      required: true,
      order: 3,
      riskWeight: 5,
      highRiskAnswers: ['High volatility'],
      allowComment: true,
    },
  ],
};

const CLIENT_ACCEPTANCE_REGULATORY_SECTION: QuestionSection = {
  key: 'client_regulatory',
  title: 'Regulatory and Compliance Environment',
  description: 'Assessment of regulatory risks and compliance history',
  questions: [
    {
      questionKey: 'Q1ClientRegulatory',
      sectionKey: 'client_regulatory',
      questionText: 'Is the client subject to significant regulatory oversight or restrictions?',
      description: 'Regulated entities may require additional considerations and expertise',
      fieldType: 'RADIO',
      options: ['No', 'Yes - specify regulatory body'],
      required: true,
      order: 1,
      riskWeight: 5,
      allowComment: true,
    },
    {
      questionKey: 'Q2ClientRegulatory',
      sectionKey: 'client_regulatory',
      questionText: 'Are there any known or suspected regulatory investigations or sanctions involving the client?',
      description: 'Regulatory issues may indicate higher risk and require additional procedures',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 9,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ClientRegulatory',
      sectionKey: 'client_regulatory',
      questionText: 'Has the client had issues with tax compliance or disputes with tax authorities?',
      description: 'Tax compliance issues may indicate systemic control weaknesses',
      fieldType: 'RADIO',
      options: ['No', 'Yes - minor', 'Yes - significant'],
      required: true,
      order: 3,
      riskWeight: 7,
      highRiskAnswers: ['Yes - significant'],
      allowComment: true,
    },
  ],
};

const CLIENT_ACCEPTANCE_REPUTATION_SECTION: QuestionSection = {
  key: 'client_reputation',
  title: 'Reputation and Integrity',
  description: 'Assessment of client and management integrity and reputation',
  questions: [
    {
      questionKey: 'Q1ClientReputation',
      sectionKey: 'client_reputation',
      questionText: 'Are you aware of any adverse information regarding the integrity of the client\'s management or owners?',
      description: 'Integrity concerns may require declining the engagement',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 10,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ClientReputation',
      sectionKey: 'client_reputation',
      questionText: 'Has the client been involved in any legal disputes, litigation, or allegations of fraud?',
      description: 'Legal and fraud concerns may indicate higher risk',
      fieldType: 'RADIO',
      options: ['No', 'Yes - minor', 'Yes - significant'],
      required: true,
      order: 2,
      riskWeight: 8,
      highRiskAnswers: ['Yes - significant'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ClientReputation',
      sectionKey: 'client_reputation',
      questionText: 'Does the client operate in high-risk sectors (e.g., cash-intensive, cryptocurrency, gambling)?',
      description: 'Certain sectors carry inherently higher risk for money laundering and fraud',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q4ClientReputation',
      sectionKey: 'client_reputation',
      questionText: 'Are there concerns about the client\'s business practices or ethical standards?',
      description: 'Ethical concerns may present reputational risk to the firm',
      fieldType: 'RADIO',
      options: ['No', 'Some concerns', 'Significant concerns'],
      required: true,
      order: 4,
      riskWeight: 8,
      highRiskAnswers: ['Significant concerns'],
      allowComment: true,
    },
  ],
};

const CLIENT_ACCEPTANCE_RELATIONSHIP_SECTION: QuestionSection = {
  key: 'client_relationship',
  title: 'Client Relationship and Communication',
  description: 'Assessment of client relationship and communication quality',
  questions: [
    {
      questionKey: 'Q1ClientRelationship',
      sectionKey: 'client_relationship',
      questionText: 'Is management cooperative and responsive to professional advice?',
      description: 'Difficult client relationships may increase engagement risk',
      fieldType: 'RADIO',
      options: ['Yes', 'Sometimes', 'No'],
      required: true,
      order: 1,
      riskWeight: 5,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ClientRelationship',
      sectionKey: 'client_relationship',
      questionText: 'Has the client frequently changed professional service providers?',
      description: 'Frequent changes may indicate difficult client relationships or "opinion shopping"',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ClientRelationship',
      sectionKey: 'client_relationship',
      questionText: 'Are there any concerns about the client\'s attitude toward compliance or internal controls?',
      description: 'Weak control environment may increase risk',
      fieldType: 'RADIO',
      options: ['No', 'Some concerns', 'Significant concerns'],
      required: true,
      order: 3,
      riskWeight: 7,
      highRiskAnswers: ['Significant concerns'],
      allowComment: true,
    },
  ],
};

const CLIENT_ACCEPTANCE_APPROVAL_SECTION: QuestionSection = {
  key: 'client_approval',
  title: 'Recommendation and Approval',
  description: 'Final assessment and recommendation',
  questions: [
    {
      questionKey: 'Q1ClientApproval',
      sectionKey: 'client_approval',
      questionText: 'Based on the above assessment, do you recommend accepting this client?',
      description: 'Overall recommendation considering all risk factors',
      fieldType: 'RADIO',
      options: ['Yes - Accept', 'Accept with conditions', 'Decline'],
      required: true,
      order: 1,
      riskWeight: 0,
      allowComment: true,
    },
    {
      questionKey: 'Q2ClientApproval',
      sectionKey: 'client_approval',
      questionText: 'If accepting with conditions or concerns, specify additional safeguards or procedures required',
      description: 'Document any additional procedures, enhanced monitoring, or safeguards',
      fieldType: 'TEXTAREA',
      required: false,
      order: 2,
      riskWeight: 0,
    },
  ],
};

export const CLIENT_ACCEPTANCE_QUESTIONNAIRE: QuestionSection[] = [
  CLIENT_ACCEPTANCE_BACKGROUND_SECTION,
  CLIENT_ACCEPTANCE_FINANCIAL_SECTION,
  CLIENT_ACCEPTANCE_REGULATORY_SECTION,
  CLIENT_ACCEPTANCE_REPUTATION_SECTION,
  CLIENT_ACCEPTANCE_RELATIONSHIP_SECTION,
  CLIENT_ACCEPTANCE_APPROVAL_SECTION,
];

// =============================================================================
// ENGAGEMENT_ACCEPTANCE_FULL - Engagement-Level Acceptance (Comprehensive)
// Formerly ACCEPTANCE_FULL - renamed for clarity
// Focuses on engagement-specific risks, not client-level risks
// =============================================================================

const ACCEPTANCE_FULL_INDEPENDENCE_SECTION: QuestionSection = {
  key: 'independence',
  title: 'Independence and Other Considerations',
  description: 'Assessment of independence, conflicts of interest, and other key considerations',
  questions: [
    {
      questionKey: 'Q1Independence',
      sectionKey: 'independence',
      questionText: 'Are you aware of any personal, family or financial relationships between the firm, partners, consultants, directors other members of the network and the client?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards include independent review, periodic quality control review, use of separate engagement team etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2Independence',
      sectionKey: 'independence',
      questionText: 'Do any potential conflicts of interest, arising from work carried out by the firm or a member of the Mazars network exist?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards includes: Notifying the clients(s) and all known relevant parties of the possible conflict and obtaining their consent to act in such circumstances. Use of separate engagement teams, with clear guidelines to each team on applicable security and confidentiality issues.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3Independence',
      sectionKey: 'independence',
      questionText: 'Do any disputes or litigation that could affect independence exist between the client and the firm, one of the partners, consultants, directors or a member of the network?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards include independent review, periodic quality control review.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 9,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q4Independence',
      sectionKey: 'independence',
      questionText: 'Are total fees generated by this client likely to be greater than 10% of the office department\'s total fees?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards include: Advising the client of the engagement terms and the basis on which fees are charged. Ensuring appropriate time and staff are allocated. Performing quality assurance review of the work done by another professional of the firm. Asking the risk management function to validate the decision to continue the assignment. Please include the following calculations: Estimated Engagement Fee, Estimated department budget for the year, Engagement fee as % of department budget (Fee / Budget)',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 4,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q5Independence',
      sectionKey: 'independence',
      questionText: 'Does the client represent more than 50% of the engagement leader\'s portfolio?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards includes: Notifying the clients(s) and all known relevant parties of the possible conflict and obtaining their consent to act in such circumstances. Use of separate engagement teams, with clear guidelines to each team on applicable security and confidentiality issues.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 5,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q6Independence',
      sectionKey: 'independence',
      questionText: 'Must the firm or network acquire additional resources and/or specific knowledge/expertise to perform the engagement, due to the lack of competencies and resources to perform the engagement within the firm?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 6,
      riskWeight: 5,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q7Independence',
      sectionKey: 'independence',
      questionText: 'Is the group engagement partner unable to assess the independence and competence of the auditors of significant components, where he/she will not able to be directly involved in the audit work of those component auditors to the extent necessary to obtain appropriate audit evidence and where these component auditors do not operate in a regulatory environment that actively oversees auditors?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 7,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q8Independence',
      sectionKey: 'independence',
      questionText: 'If the group engagement partner and the members of their network, does not cover directly >50% of any one of the following Group benchmarks: Revenues, Result before Tax, Total Assets or Net Assets/Shareholders\' Funds, or other applicable benchmark, has the acceptance been approved by the country risk manager and, for new PIE audits, at the group risk management level? (Where joint auditors conduct the group audit, the joint engagement partners and the members of their networks collectively constitute the group engagement partner).',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 8,
      riskWeight: 6,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q9Independence',
      sectionKey: 'independence',
      questionText: 'Have contacts with the previous service providers identified problems e.g. scope limitation, inadequate or unpaid fees, fraud etc.?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 9,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q10Independence',
      sectionKey: 'independence',
      questionText: 'Is the fee budget proposed inadequate in the light of the size of the client, its control environment or the complexity of the engagement?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 10,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q11Independence',
      sectionKey: 'independence',
      questionText: 'Is there a scope limitation imposed by the client, or lack of information to perform the assignment?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 11,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q12Independence',
      sectionKey: 'independence',
      questionText: 'Are there problems carrying out an EQR e.g. where required in terms of Mazars policy?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 12,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q13Independence',
      sectionKey: 'independence',
      questionText: 'Where relevant, has the firm informed the regulatory authority prior to appointment e.g. JSE?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 13,
      riskWeight: 5,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q14Independence',
      sectionKey: 'independence',
      questionText: 'Has the client or audit committee raised issues regarding independence or other factors affecting the appointment of the firm?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 14,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q15Independence',
      sectionKey: 'independence',
      questionText: 'Are one of the services we are asked to perform for the engagement, involve the firm or a partner being appointed as a Trustee.',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 15,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q16Independence',
      sectionKey: 'independence',
      questionText: 'Who is the partner that is appointed as the trustee',
      description: '',
      fieldType: 'TEXTAREA',
      required: true,
      order: 16,
      riskWeight: 0,
      conditionalDisplay: {
        dependsOn: 'Q15Independence',
        requiredAnswer: 'Yes',
      },
    },
    {
      questionKey: 'Q17Independence',
      sectionKey: 'independence',
      questionText: 'Please give some background as to why an appointment of a trustee is needed and what is expected of the trustee',
      description: '',
      fieldType: 'TEXTAREA',
      required: false,
      order: 17,
      riskWeight: 0,
      conditionalDisplay: {
        dependsOn: 'Q15Independence',
        requiredAnswer: 'Yes',
      },
    },
    {
      questionKey: 'NOTE_SUPPORTING_DOCS',
      sectionKey: 'independence',
      questionText: 'Please attach your WeCheck report and PONG report under \'Supporting Documents\'',
      description: '',
      fieldType: 'PLACEHOLDER',
      required: false,
      order: 18,
      riskWeight: 0,
    },
  ],
};

export const ACCEPTANCE_FULL_SECTIONS: QuestionSection[] = [
  ACCEPTANCE_FULL_INDEPENDENCE_SECTION,
];

// =============================================================================
// CONTINUANCE FULL - Existing Client Continuance (Comprehensive)
// =============================================================================

const CONTINUANCE_FULL_INDEPENDENCE_SECTION: QuestionSection = {
  key: 'continuance_independence',
  title: 'Independence and Other Considerations',
  description: 'Annual review of independence and other key considerations for existing clients',
  questions: [
    {
      questionKey: 'Q1ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '1. Is there any indication of a change in the client risk assessment?',
      description: 'If Yes, re-perform the risk rating and acceptance process above if the client becomes risky.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '2. Has any new situation been identified which creates a potential threat to independence?',
      description: 'Possible safeguards include independent review, periodic quality control review, use of separate engagement team etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '3. Are you aware of any personal, family or financial relationships between the firm, partners, consultants, other members of the network and the client?',
      description: 'Possible safeguards include independent review, periodic quality control review, use of separate engagement team etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q4ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '4. Are gifts or hospitality given and received other than insignificant?',
      description: 'Monthly gift or hospitality confirmations are sent to all Forvis Mazars employees and reported to the quality officers and QRM',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 4,
      riskWeight: 5,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q5ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '5. Do any disputes or litigation exist that could affect independence between the client and the firm, consultants, one of the partners, directors or a member of the network?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards includes: Notifying the clients(s) and all known relevant parties of the possible conflict and obtaining their consent to act in such circumstances. Use of separate engagement teams, with clear guidelines to each team on applicable security and confidentiality issues.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 5,
      riskWeight: 9,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q6ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '6. Are total fees generated by this client likely to be greater than 10% of the office department\'s total fees?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards include: Advising the client of the engagement terms and the basis on which fees are charged. Ensuring appropriate time and staff are allocated. Performing quality assurance review of the work done by another professional of the firm. Asking the risk management function to validate the decision to continue the assignment. Please include the following calculations: Estimated Engagement Fee, Estimated department budget for the year, Engagement fee as % of department budget (Fee / Budget)',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 6,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q7ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '7. Does the client represent more than 50% of the engagement leader\'s portfolio?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards include: Advising the client of the engagement terms and the basis on which fees are charged. Ensuring appropriate time and staff are allocated. Performing quality assurance review of the work done by another professional of the firm. Asking the risk management function to validate the decision to continue the assignment.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 7,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q8ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '8. Has the client developed new activities, through normal growth or acquisition, that require additional competencies or that significantly increase the service risk?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 8,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q9ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '9. Is the fee budget inadequate to perform the assignment properly?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 9,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q10ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '10. Are there scope limitations imposed by the client or lack of information to perform the assignment properly?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 10,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q11ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '11. Are there unpaid fees? Inspect the debtors ledger to identify and analyse any outstanding fees.',
      description: 'Inspect the debtors ledger to identify and analyse any outstanding fees. Possible safeguards include an agreed payment plan, not delivering any services before settlement of the outstanding fees etc. Decline the engagement if no appropriate safeguards can be identified.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 11,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q12ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '12. Is there any breach of the requirements for partner or senior staff rotation?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 12,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q13ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '13. Are there problems carrying out an EQR e.g. where required in terms of Forvis Mazars policy?',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 13,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q14ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '14. Has the client or audit committee raised issues regarding independence or other factors affecting the appointment of the firm?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 14,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q15ContinuanceIndependence',
      sectionKey: 'continuance_independence',
      questionText: '15. If you are on WeCheck please select \'Yes\' and attach the WeCheck report under \'Supporting Documents\'. If you use an alternative to WeCheck (Conflict check) please attach an alternative confirmation of acceptance.',
      description: 'Document the description of the safeguards if answered, Yes or capture N/A, if No. Decline the engagement if no appropriate safeguards can be identified. Possible safeguards: an engagement quality control reviewer, an experienced industry or service internal or external experts, or other additional risk procedures etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes', 'N/A'],
      required: true,
      order: 15,
      riskWeight: 3,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
  ],
};

export const CONTINUANCE_FULL_SECTIONS: QuestionSection[] = [
  CONTINUANCE_FULL_INDEPENDENCE_SECTION,
];

// =============================================================================
// ACCEPTANCE LITE - New Client Acceptance (Simplified)
// =============================================================================

const ACCEPTANCE_LITE_MONEY_LAUNDERING: QuestionSection = {
  key: 'ac_lite_money_laundering',
  title: 'Assessment of the Risk of Money Laundering and Terrorist Financing Acts',
  questions: [
    {
      questionKey: 'Q1ACLiteMoney',
      sectionKey: 'ac_lite_money_laundering',
      questionText: '1. Is there evidence of dummy entities, companies or trusts?',
      description: 'Examples include: The formation of entities, companies or trusts with no apparent commercial or other purpose. Frequent and unjustified changes of the entities\' constitution/trust deed/articles/memorandum of incorporation etc. The use of financial, legal or other advisers who provide their names as executives, directors or trustees, with little or no commercial involvement.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ACLiteMoney',
      sectionKey: 'ac_lite_money_laundering',
      questionText: '2. Is there evidence of unusual operations regarding the economic activities of the client?',
      description: 'Examples include: Lack of documentation on the source of the client\'s funds or wealth. Transactions that appear inconsistent with the client\'s business, or using unusual circuits, or transactions in which the identity of the beneficial owners is difficult to determine or there is unauthorised or improperly recorded transactions or interrupted audit trial. Large unusual monetary transactions, particular the exchange of tradable financial instruments or the transfer of funds to accounts in \'off-shore\' locations. Where the client is keen to keep their anonymity, or actively avoids personal contact, or request that we conduct the engagement with undue secrecy?',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 9,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
  ],
};

const ACCEPTANCE_LITE_INDEPENDENCE: QuestionSection = {
  key: 'ac_lite_independence',
  title: 'Independence and Other Considerations',
  questions: [
    {
      questionKey: 'Q1ACLiteINDP',
      sectionKey: 'ac_lite_independence',
      questionText: '1. Are you aware of any personal, family or financial relationships between the firm, partners, consultants, directors other members of the network and the client?',
      description: 'Use the engagement team independence template below if close personal or business relationships exists. Possible safeguards include independent review, periodic quality control review, use of separate engagement team etc.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ACLiteINDP',
      sectionKey: 'ac_lite_independence',
      questionText: '2. Do any potential conflicts of interest, arising from work carried out by the firm or a member of the Forvis Mazars network exist?',
      description: 'Possible safeguards include: Consulting the head of ethics of the firm. Notifying the clients(s) and all known relevant parties of the possible conflict and obtaining their consent to act in such circumstances. Use of separate engagement teams, with clear guidelines to each team on applicable security and confidentiality issues.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ACLiteINDP',
      sectionKey: 'ac_lite_independence',
      questionText: '3. Is the engagement team competent to perform the engagement and do they have the necessary capabilities, including time and resources to complete the engagement?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 6,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
  ],
};

const ACCEPTANCE_LITE_KYC: QuestionSection = {
  key: 'ac_lite_kyc',
  title: 'Know Your Client (KYC) Procedures',
  description: 'New client or changes to existing client\'s circumstances',
  questions: [
    {
      questionKey: 'Q1ACLiteKYC',
      sectionKey: 'ac_lite_kyc',
      questionText: 'Please select your client type',
      description: 'Individuals, Private companies or Close Corporations, Partnerships / Sole traders, Trusts, or None of the above.',
      fieldType: 'RADIO',
      options: ['Individuals', 'Private companies or Close Corporations', 'Partnerships / Sole traders', 'Trusts', 'None of the above'],
      required: true,
      order: 1,
      riskWeight: 2,
      highRiskAnswers: ['Trusts'],
      allowComment: true,
    },
  ],
};

const ACCEPTANCE_LITE_PART_A: QuestionSection = {
  key: 'ac_lite_part_a',
  title: 'Part A - Risk Considered as Major',
  questions: [
    {
      questionKey: 'Q1ACLitePartA',
      sectionKey: 'ac_lite_part_a',
      questionText: '1. Have fraud risks, risk of money laundering and/or other criminal activities been identified from your knowledge and understanding of the client\'s activities?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 10,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ACLitePartA',
      sectionKey: 'ac_lite_part_a',
      questionText: '2. How would we rate the risk associated with the reputation and integrity of high level management? The business reputation and integrity of related parties? Any undue pressure to achieve certain financial or other results?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 8,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ACLitePartA',
      sectionKey: 'ac_lite_part_a',
      questionText: '3. The type and extent of media coverage of the company or management, problems encountered with regulators e.g. market, industry etc.?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q4ACLitePartA',
      sectionKey: 'ac_lite_part_a',
      questionText: '4. The attitude of the company towards their service providers e.g. litigation, no access to certain information, the client is aggressive in maintaining the fees as low as possible, not accepting our engagement letter\'s standard terms and conditions?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 4,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q5ACLitePartA',
      sectionKey: 'ac_lite_part_a',
      questionText: '5. Going concern issues?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 5,
      riskWeight: 7,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
  ],
};

const ACCEPTANCE_LITE_PART_B: QuestionSection = {
  key: 'ac_lite_part_b',
  title: 'Part B - Risk Considered as Normal',
  questions: [
    {
      questionKey: 'Q1ACLitePartB',
      sectionKey: 'ac_lite_part_b',
      questionText: '1. Does the entity have problems in the application of standards or legislation, any non-compliance with regulations or a history of Reportable Irregularities or Non Compliance with Laws and Regulations?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 6,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ACLitePartB',
      sectionKey: 'ac_lite_part_b',
      questionText: '2. Do we have clarity of legal structure and identification of ultimate beneficial owners',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 5,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ACLitePartB',
      sectionKey: 'ac_lite_part_b',
      questionText: '3. Any tax risks? (eg. features of the entity or business that would indicate tax risk)',
      description: 'Document the reasons for the risk rating in terms of the underlying service you provide.',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 5,
      highRiskAnswers: ['Yes'],
      allowComment: true,
    },
  ],
};

const ACCEPTANCE_LITE_CRITERIA: QuestionSection = {
  key: 'ac_lite_criteria',
  title: 'AC Lite Eligibility Criteria',
  description: 'Confirm the engagement meets simplified acceptance criteria',
  questions: [
    {
      questionKey: 'Q1ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '1. Standalone client that does not form part of a group (Client\'s group)?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 1,
      riskWeight: 2,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q2ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '2. Less-complex client with little or no significant judgments and estimates involved in the engagement?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 2,
      riskWeight: 3,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q3ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '3. Our total estimated annual fee for all lines of service is less than R250,000?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 3,
      riskWeight: 2,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q4ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '4. Client is NOT a Public Interest Entity (PIE) nor a Transnational client?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 4,
      riskWeight: 4,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q5ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '5. No Politically Exposed Persons are involved with the client (PEPs)?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 5,
      riskWeight: 5,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
    {
      questionKey: 'Q6ACLite',
      sectionKey: 'ac_lite_criteria',
      questionText: '6. Client is not a restricted entity?',
      description: '',
      fieldType: 'RADIO',
      options: ['No', 'Yes'],
      required: true,
      order: 6,
      riskWeight: 4,
      highRiskAnswers: ['No'],
      allowComment: true,
    },
  ],
};

export const ACCEPTANCE_LITE_SECTIONS: QuestionSection[] = [
  ACCEPTANCE_LITE_MONEY_LAUNDERING,
  ACCEPTANCE_LITE_INDEPENDENCE,
  ACCEPTANCE_LITE_KYC,
  ACCEPTANCE_LITE_PART_A,
  ACCEPTANCE_LITE_PART_B,
  ACCEPTANCE_LITE_CRITERIA,
];

// =============================================================================
// CONTINUANCE LITE - Existing Client Continuance (Simplified)
// =============================================================================

// Continuance Lite uses same sections as Acceptance Lite
// (based on SharePoint's continuance_lite_fields structure)
export const CONTINUANCE_LITE_SECTIONS: QuestionSection[] = [
  ACCEPTANCE_LITE_MONEY_LAUNDERING,
  ACCEPTANCE_LITE_INDEPENDENCE,
  ACCEPTANCE_LITE_KYC,
  ACCEPTANCE_LITE_PART_A,
  ACCEPTANCE_LITE_PART_B,
  ACCEPTANCE_LITE_CRITERIA,
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getQuestionnaireDefinition(type: QuestionnaireType): QuestionSection[] {
  switch (type) {
    case 'CLIENT_ACCEPTANCE':
      return CLIENT_ACCEPTANCE_QUESTIONNAIRE;
    case 'ENGAGEMENT_ACCEPTANCE_FULL':
    case 'ACCEPTANCE_FULL': // Legacy support
      return ACCEPTANCE_FULL_SECTIONS;
    case 'ENGAGEMENT_ACCEPTANCE_LITE':
    case 'ACCEPTANCE_LITE': // Legacy support
      return ACCEPTANCE_LITE_SECTIONS;
    case 'CONTINUANCE_FULL':
      return CONTINUANCE_FULL_SECTIONS;
    case 'CONTINUANCE_LITE':
      return CONTINUANCE_LITE_SECTIONS;
    default:
      throw new Error(`Unknown questionnaire type: ${type}`);
  }
}

export function getAllQuestions(type: QuestionnaireType): AcceptanceQuestionDef[] {
  const sections = getQuestionnaireDefinition(type);
  return sections.flatMap((section) => section.questions);
}

export function getQuestionBySectionAndKey(
  type: QuestionnaireType,
  sectionKey: string,
  questionKey: string
): AcceptanceQuestionDef | undefined {
  const sections = getQuestionnaireDefinition(type);
  const section = sections.find((s) => s.key === sectionKey);
  return section?.questions.find((q) => q.questionKey === questionKey);
}






















