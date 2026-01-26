/**
 * Pre-built section templates for manual template creation
 * These provide common engagement letter sections with standard placeholders
 */

export interface SectionTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  isRequired: boolean;
  isAiAdaptable: boolean;
  category: 'opening' | 'scope' | 'terms' | 'legal' | 'closing';
  tags?: string[];
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  // Opening Category
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Opening paragraph with client and engagement details',
    content: `Dear {{clientName}},

We are pleased to confirm our understanding of the services we are to provide for {{clientName}} for the {{taxYear}} tax year.

This letter serves to document the nature and extent of the services we will provide, the respective responsibilities of both parties, and other terms of our engagement.`,
    isRequired: true,
    isAiAdaptable: true,
    category: 'opening',
    tags: ['recommended', 'popular'],
  },
  {
    id: 'engagement_overview',
    title: 'Engagement Overview',
    description: 'Summary of engagement purpose and objectives',
    content: `## Engagement Overview

This engagement letter outlines our professional relationship with {{clientName}} for {{taskType}} services. Our engagement is designed to provide you with professional services in accordance with applicable professional standards and regulations.

**Engagement Period:** {{taxPeriodStart}} to {{taxPeriodEnd}}

**Service Line:** {{serviceLine}}`,
    isRequired: false,
    isAiAdaptable: true,
    category: 'opening',
  },

  // Scope Category
  {
    id: 'scope_of_services',
    title: 'Scope of Services',
    description: 'Detailed description of services to be provided',
    content: `## Scope of Services

We will provide the following services for {{clientName}}:

- Preparation of federal and state income tax returns
- Review of tax positions and documentation
- Identification of tax planning opportunities
- Consultation on tax matters as they arise
- Representation before tax authorities if required

Our services are limited to those specifically outlined in this agreement. Any additional services will require a separate engagement letter.`,
    isRequired: true,
    isAiAdaptable: true,
    category: 'scope',
    tags: ['recommended'],
  },
  {
    id: 'deliverables',
    title: 'Deliverables',
    description: 'List of expected deliverables and outputs',
    content: `## Deliverables

Upon completion of this engagement, we will provide:

1. Completed and filed tax returns for {{taxYear}}
2. Copy of all filed returns for your records
3. Documentation of tax positions taken
4. Summary of key findings and recommendations
5. Electronic copies of all supporting workpapers

All deliverables will be provided by {{currentDate}} unless otherwise agreed.`,
    isRequired: false,
    isAiAdaptable: true,
    category: 'scope',
  },
  {
    id: 'professional_standards',
    title: 'Professional Standards',
    description: 'Compliance and professional standards section',
    content: `## Professional Standards

Our services will be conducted in accordance with:

- Generally Accepted Accounting Principles (GAAP)
- Professional standards established by the American Institute of Certified Public Accountants (AICPA)
- Internal Revenue Code and applicable tax regulations
- Professional ethics requirements

We maintain independence as required by professional standards and will notify you immediately if any conflicts of interest arise.`,
    isRequired: true,
    isAiAdaptable: false,
    category: 'scope',
    tags: ['recommended'],
  },

  // Terms Category
  {
    id: 'client_responsibilities',
    title: 'Client Responsibilities',
    description: 'Client obligations and responsibilities',
    content: `## Your Responsibilities

{{clientName}} is responsible for:

1. **Information Accuracy:** Providing complete and accurate financial information, records, and documentation in a timely manner
2. **Record Retention:** Maintaining adequate accounting records and supporting documentation
3. **Review:** Reviewing all documents, returns, and reports before approval
4. **Timely Response:** Responding promptly to our requests for information
5. **Disclosure:** Informing us of any significant changes in operations or circumstances

You are responsible for the accuracy and completeness of all information provided to us.`,
    isRequired: true,
    isAiAdaptable: true,
    category: 'terms',
    tags: ['recommended'],
  },
  {
    id: 'firm_responsibilities',
    title: 'Our Responsibilities',
    description: 'Firm obligations and commitments',
    content: `## Our Responsibilities

As your professional service provider, we commit to:

1. **Professional Care:** Exercising due professional care in the performance of services
2. **Quality Standards:** Maintaining quality control procedures
3. **Communication:** Keeping you informed of progress and any issues
4. **Confidentiality:** Protecting your confidential information
5. **Competence:** Assigning qualified professionals to your engagement

We will perform our services with the skill and care ordinarily exercised by members of our profession.`,
    isRequired: false,
    isAiAdaptable: false,
    category: 'terms',
  },
  {
    id: 'fees_and_billing',
    title: 'Fees & Billing',
    description: 'Fee structure and payment terms',
    content: `## Fees and Billing

Our fees for these services are based on the time required at our standard billing rates. Factors affecting the total fee include:

- Complexity of the engagement
- Skill level of personnel assigned
- Degree of responsibility involved
- Time constraints and deadlines

**Payment Terms:**
- Invoices are due upon receipt
- Payment is expected within 30 days
- Interest may be charged on overdue accounts

We reserve the right to suspend services if accounts become significantly overdue.`,
    isRequired: true,
    isAiAdaptable: true,
    category: 'terms',
    tags: ['popular'],
  },
  {
    id: 'timeline_and_deadlines',
    title: 'Timeline & Deadlines',
    description: 'Project timeline and key milestones',
    content: `## Timeline and Deadlines

**Key Dates:**

- Information Due Date: [Date]
- Draft Review Date: [Date]
- Final Delivery Date: {{currentDate}}
- Filing Deadline: [Date]

Meeting these deadlines depends on receiving complete and accurate information from {{clientName}} by the agreed-upon dates. Delays in providing information may impact our ability to meet filing deadlines.

Extensions may be filed if necessary, subject to applicable penalties and interest.`,
    isRequired: false,
    isAiAdaptable: true,
    category: 'terms',
  },

  // Legal Category
  {
    id: 'limitations_of_engagement',
    title: 'Limitations of Engagement',
    description: 'Scope limitations and disclaimers',
    content: `## Limitations of Engagement

This engagement is limited to the services specifically outlined in this letter. We will not:

- Audit or verify the information you provide
- Search for fraud, defalcations, or other irregularities
- Express an opinion on financial statements
- Provide assurance on internal controls
- Perform forensic accounting procedures

Our engagement cannot be relied upon to disclose errors, fraud, or illegal acts. We are not responsible for detecting such matters unless specifically engaged to do so.`,
    isRequired: true,
    isAiAdaptable: false,
    category: 'legal',
    tags: ['recommended'],
  },
  {
    id: 'confidentiality',
    title: 'Confidentiality',
    description: 'Data protection and confidentiality provisions',
    content: `## Confidentiality and Data Protection

We will maintain the confidentiality of {{clientName}}'s information in accordance with:

- Professional ethics requirements
- Applicable privacy laws and regulations
- Our firm's confidentiality policies

**Information Sharing:**
Information may be shared with:
- Regulatory authorities as required by law
- Our professional liability insurance carrier if necessary
- Other service providers working on your engagement (with your consent)

We use secure methods for storing and transmitting your information and maintain appropriate safeguards to protect your data.`,
    isRequired: true,
    isAiAdaptable: false,
    category: 'legal',
    tags: ['recommended'],
  },
  {
    id: 'dispute_resolution',
    title: 'Dispute Resolution',
    description: 'Process for resolving disagreements',
    content: `## Dispute Resolution

In the event of any disagreement or dispute relating to this engagement:

1. **Direct Discussion:** Parties agree to first attempt to resolve the matter through direct discussion
2. **Mediation:** If direct discussion fails, parties agree to mediation before pursuing other remedies
3. **Governing Law:** This agreement shall be governed by the laws of [State]
4. **Venue:** Any legal action shall be brought in [County] courts

Both parties agree to act in good faith to resolve any disputes promptly and professionally.`,
    isRequired: false,
    isAiAdaptable: false,
    category: 'legal',
  },
  {
    id: 'liability_limitation',
    title: 'Limitation of Liability',
    description: 'Liability limitations and indemnification',
    content: `## Limitation of Liability

To the fullest extent permitted by law, our liability for any claims arising from this engagement shall be limited to the amount of fees paid for the specific services giving rise to the claim.

**Indemnification:**
{{clientName}} agrees to indemnify and hold harmless our firm from any claims arising from:
- Management decisions or actions
- Information provided by {{clientName}} that is inaccurate or incomplete
- Failure to follow our advice or recommendations

This limitation does not apply to claims arising from our gross negligence or willful misconduct.`,
    isRequired: false,
    isAiAdaptable: false,
    category: 'legal',
  },

  // Closing Category
  {
    id: 'terms_and_conditions',
    title: 'Terms & Conditions',
    description: 'General terms and conditions of engagement',
    content: `## Terms and Conditions

**Termination:**
Either party may terminate this engagement with written notice. You will be responsible for our fees and expenses through the termination date.

**Ownership of Work:**
Upon receipt of payment, all deliverables become your property. We retain the right to maintain copies for our files and quality control purposes.

**Communication:**
Unless you instruct us otherwise, we may communicate with you using email and other electronic means.

**Amendment:**
This agreement may only be amended in writing signed by both parties.`,
    isRequired: false,
    isAiAdaptable: false,
    category: 'closing',
  },
  {
    id: 'acceptance_signature',
    title: 'Acceptance & Signature',
    description: 'Signature block for engagement acceptance',
    content: `## Acceptance of Terms

Please sign below to indicate your acceptance of the terms of this engagement letter.

---

**{{clientName}}**

By: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Title: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

**Forvis Mazars**

By: {{partnerName}}

Title: Partner

Date: {{currentDate}}`,
    isRequired: true,
    isAiAdaptable: false,
    category: 'closing',
    tags: ['recommended', 'popular'],
  },
];

// Helper functions
export function getSectionTemplatesByCategory(category: SectionTemplate['category']): SectionTemplate[] {
  return SECTION_TEMPLATES.filter(template => template.category === category);
}

export function getRecommendedSectionTemplates(): SectionTemplate[] {
  return SECTION_TEMPLATES.filter(template => template.tags?.includes('recommended'));
}

export function getSectionTemplateById(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find(template => template.id === id);
}

export const SECTION_CATEGORIES = [
  { id: 'opening', label: 'Opening', description: 'Introduction and overview sections' },
  { id: 'scope', label: 'Scope', description: 'Services and deliverables' },
  { id: 'terms', label: 'Terms', description: 'Responsibilities and billing' },
  { id: 'legal', label: 'Legal', description: 'Legal terms and limitations' },
  { id: 'closing', label: 'Closing', description: 'Final terms and signatures' },
] as const;
