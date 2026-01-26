/**
 * Seed Service Lines Script
 * 
 * Populates the ServiceLineMaster table with default service lines.
 * This script is idempotent - it can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ServiceLineSeed {
  code: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

const serviceLines: ServiceLineSeed[] = [
  {
    code: 'TAX',
    name: 'Tax Services',
    description: 'Tax consulting, compliance, and advisory services',
    active: true,
    sortOrder: 1,
  },
  {
    code: 'AUDIT',
    name: 'Audit & Assurance',
    description: 'Financial audit and assurance services',
    active: true,
    sortOrder: 2,
  },
  {
    code: 'ACCOUNTING',
    name: 'Accounting',
    description: 'Accounting and bookkeeping services',
    active: true,
    sortOrder: 3,
  },
  {
    code: 'ADVISORY',
    name: 'Advisory',
    description: 'Business advisory and consulting services',
    active: true,
    sortOrder: 4,
  },
  {
    code: 'QRM',
    name: 'Quality & Risk Management',
    description: 'Quality assurance and risk management',
    active: true,
    sortOrder: 5,
  },
  {
    code: 'BUSINESS_DEV',
    name: 'Business Development',
    description: 'Business development and client relations',
    active: true,
    sortOrder: 6,
  },
  {
    code: 'IT',
    name: 'Information Technology',
    description: 'IT services and support',
    active: true,
    sortOrder: 7,
  },
  {
    code: 'FINANCE',
    name: 'Finance',
    description: 'Finance and financial management',
    active: true,
    sortOrder: 8,
  },
  {
    code: 'HR',
    name: 'Human Resources',
    description: 'Human resources and people management',
    active: true,
    sortOrder: 9,
  },
  {
    code: 'COUNTRY_MANAGEMENT',
    name: 'Country Management',
    description: 'Executive reporting and business analysis',
    active: true,
    sortOrder: 10,
  },
];

async function main() {
  console.log('🌱 Seeding service lines...');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const serviceLine of serviceLines) {
    try {
      // Check if service line already exists
      const existing = await prisma.serviceLineMaster.findUnique({
        where: { code: serviceLine.code },
      });

      if (existing) {
        // Update existing service line
        await prisma.serviceLineMaster.update({
          where: { code: serviceLine.code },
          data: {
            name: serviceLine.name,
            description: serviceLine.description,
            active: serviceLine.active,
            sortOrder: serviceLine.sortOrder,
            updatedAt: new Date(),
          },
        });
        updated++;
        console.log(`  ✓ Updated: ${serviceLine.code} - ${serviceLine.name}`);
      } else {
        // Create new service line
        await prisma.serviceLineMaster.create({
          data: {
            ...serviceLine,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        created++;
        console.log(`  + Created: ${serviceLine.code} - ${serviceLine.name}`);
      }
    } catch (error) {
      skipped++;
      console.error(`  ✗ Error processing ${serviceLine.code}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${serviceLines.length}`);
  
  // Display all service lines
  console.log('\n📋 Service Lines in database:');
  const allServiceLines = await prisma.serviceLineMaster.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  
  for (const sl of allServiceLines) {
    const status = sl.active ? '✓' : '✗';
    console.log(`  ${status} ${sl.code.padEnd(15)} - ${sl.name}`);
  }

  console.log('\n✅ Service line seeding completed!');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding service lines:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });











