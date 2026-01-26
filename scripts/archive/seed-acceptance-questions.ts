/**
 * Seed script to populate AcceptanceQuestion table with question definitions
 * Run with: npx tsx scripts/seed-acceptance-questions.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  ACCEPTANCE_FULL_SECTIONS,
  CONTINUANCE_FULL_SECTIONS,
  ACCEPTANCE_LITE_SECTIONS,
  CONTINUANCE_LITE_SECTIONS,
  QuestionnaireType,
  QuestionSection,
} from '../../src/constants/acceptance-questions';

const prisma = new PrismaClient();

interface SectionWithType {
  type: QuestionnaireType;
  sections: QuestionSection[];
}

async function main() {
  console.log('🌱 Seeding AcceptanceQuestion table...');

  const allSections: SectionWithType[] = [
    {
      type: 'ACCEPTANCE_FULL',
      sections: ACCEPTANCE_FULL_SECTIONS,
    },
    {
      type: 'CONTINUANCE_FULL',
      sections: CONTINUANCE_FULL_SECTIONS,
    },
    {
      type: 'ACCEPTANCE_LITE',
      sections: ACCEPTANCE_LITE_SECTIONS,
    },
    {
      type: 'CONTINUANCE_LITE',
      sections: CONTINUANCE_LITE_SECTIONS,
    },
  ];

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const { type, sections } of allSections) {
    console.log(`\n📋 Processing ${type}...`);

    for (const section of sections) {
      console.log(`  📂 Section: ${section.title}`);

      for (const question of section.questions) {
        // Prepare data
        const data = {
          questionnaireType: type,
          sectionKey: question.sectionKey,
          questionKey: question.questionKey,
          questionText: question.questionText,
          description: question.description || null,
          fieldType: question.fieldType,
          options: question.options ? JSON.stringify(question.options) : null,
          required: question.required,
          order: question.order,
          riskWeight: question.riskWeight,
          highRiskAnswers: question.highRiskAnswers ? JSON.stringify(question.highRiskAnswers) : null,
        };

        // Upsert question
        try {
          const result = await prisma.acceptanceQuestion.upsert({
            where: {
              questionnaireType_questionKey: {
                questionnaireType: type,
                questionKey: question.questionKey,
              },
            },
            create: data,
            update: data,
          });

          // Check if it was created or updated (based on timestamps)
          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            totalInserted++;
            console.log(`    ✅ Inserted: ${question.questionKey}`);
          } else {
            totalUpdated++;
            console.log(`    🔄 Updated: ${question.questionKey}`);
          }
        } catch (error) {
          console.error(`    ❌ Error processing ${question.questionKey}:`, error);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Seeding complete!`);
  console.log(`   Inserted: ${totalInserted} questions`);
  console.log(`   Updated: ${totalUpdated} questions`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





















