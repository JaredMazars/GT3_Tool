/**
 * Seed default engagement letter template
 * 
 * Run this script to populate the database with a default engagement letter template
 * Usage: npx ts-node scripts/seed-default-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default engagement letter template...');

  // Create default engagement letter template
  const template = await prisma.template.create({
    data: {
      name: 'Standard Engagement Letter',
      description: 'Default engagement letter template for all service lines',
      type: 'ENGAGEMENT_LETTER',
      serviceLine: null, // Available to all service lines
      projectType: null, // Available to all project types
      content: '', // Content will be built from sections
      active: true,
      createdBy: 'system',
    },
  });

  console.log(`✅ Created template: ${template.name} (ID: ${template.id})`);

  // Create sections
  const sections = [
    {
      sectionKey: 'header',
      title: 'Header',
      content: `# ENGAGEMENT LETTER

**Date:** {{currentDate}}

**To:** {{clientName}}  
**Client Code:** {{clientCode}}  
**Project:** {{projectName}}

---`,
      isRequired: true,
      isAiAdaptable: false,
      order: 1,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'introduction',
      title: 'Introduction',
      content: `## 1. INTRODUCTION

This letter confirms our understanding of the terms and objectives of our engagement and the nature and limitations of the services we will provide.

We are pleased to have the opportunity to work with {{clientName}} on this {{projectType}} engagement.`,
      isRequired: true,
      isAiAdaptable: true,
      order: 2,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'scope_of_services',
      title: 'Scope of Services',
      content: `## 2. SCOPE OF SERVICES

We have been engaged to provide the following services:

**Project Type:** {{projectType}}  
**Service Line:** {{serviceLine}}  
**Tax Year:** {{taxYear}}  
**Period:** {{taxPeriodStart}} to {{taxPeriodEnd}}

**Project Description:** {{projectDescription}}

Our services will include all necessary procedures to complete the engagement in accordance with professional standards and best practices.`,
      isRequired: true,
      isAiAdaptable: true,
      order: 3,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'responsibilities',
      title: 'Responsibilities',
      content: `## 3. RESPONSIBILITIES

### 3.1 Our Responsibilities
- Perform the services with professional care and in accordance with applicable professional standards
- Maintain the confidentiality of your information
- Provide timely communication regarding the progress of the engagement
- Deliver work products in accordance with agreed timelines
- Apply our professional judgment and maintain objectivity throughout the engagement

### 3.2 Client Responsibilities
- Provide complete and accurate information required for the engagement
- Make management personnel available for consultations
- Review and approve deliverables in a timely manner
- Ensure payment of fees in accordance with agreed terms
- Provide access to all relevant documentation and systems as needed`,
      isRequired: true,
      isAiAdaptable: false,
      order: 4,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'fees_and_payment',
      title: 'Fees and Payment Terms',
      content: `## 4. FEES AND PAYMENT TERMS

Our fees are based on the time required by the individuals assigned to the engagement and their professional qualifications. We will bill you on a monthly basis, and payment is due within 30 days of the invoice date.

Any expenses incurred on your behalf will be billed separately and are due upon receipt of our invoice.

We reserve the right to suspend our services if invoices remain unpaid beyond the agreed payment terms.`,
      isRequired: true,
      isAiAdaptable: false,
      order: 5,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'term_and_termination',
      title: 'Term and Termination',
      content: `## 5. TERM AND TERMINATION

This engagement begins on the date of this letter and continues until completion of the agreed scope of work. Either party may terminate this engagement with 30 days' written notice.

In the event of termination, we will be entitled to payment for all services rendered and expenses incurred up to the termination date.`,
      isRequired: true,
      isAiAdaptable: false,
      order: 6,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'confidentiality',
      title: 'Confidentiality',
      content: `## 6. CONFIDENTIALITY

We will maintain the confidentiality of your information, except as required by law or professional standards. We may use your information for internal quality control, training, and administrative purposes.

All confidential information will be protected in accordance with our firm's information security policies and applicable data protection legislation.`,
      isRequired: true,
      isAiAdaptable: false,
      order: 7,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'tax_specific',
      title: 'Tax Services Specific Terms',
      content: `## 7. TAX SERVICES

Our tax services are based on tax laws and regulations as they exist at the time of our work. Tax laws are subject to change, and future changes may affect our conclusions.

We will not audit or verify the information provided to us. You are responsible for the accuracy and completeness of all information provided.

Our services do not include representation before tax authorities unless specifically agreed upon in writing.`,
      isRequired: false,
      isAiAdaptable: true,
      order: 8,
      applicableServiceLines: ['TAX'],
      applicableProjectTypes: null,
    },
    {
      sectionKey: 'acceptance',
      title: 'Acceptance',
      content: `## 8. ACCEPTANCE

Please sign and return a copy of this letter to indicate your acceptance of the terms outlined herein.

---

**Forvis Mazars**

Partner: {{partnerName}}  
Date: ___________________

---

**Client Acceptance**

Name: ___________________  
Title: ___________________  
Signature: ___________________  
Date: ___________________

---

*This engagement letter is governed by the laws of South Africa.*`,
      isRequired: true,
      isAiAdaptable: false,
      order: 9,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    },
  ];

  for (const sectionData of sections) {
    const section = await prisma.templateSection.create({
      data: {
        ...sectionData,
        templateId: template.id,
        applicableServiceLines: sectionData.applicableServiceLines
          ? JSON.stringify(sectionData.applicableServiceLines)
          : null,
        applicableProjectTypes: sectionData.applicableProjectTypes
          ? JSON.stringify(sectionData.applicableProjectTypes)
          : null,
      },
    });
    console.log(`  ✅ Created section: ${section.title}`);
  }

  console.log('🎉 Seeding completed successfully!');
  console.log(`Template ID: ${template.id}`);
  console.log(`Total sections: ${sections.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding templates:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

