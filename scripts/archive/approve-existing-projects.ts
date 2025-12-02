/**
 * Migration Script: Approve Existing Client Projects
 * 
 * This script approves client acceptance and marks engagement letter as complete
 * for all existing client projects, so they can continue working without interruption.
 * 
 * Usage:
 *   npx tsx scripts/approve-existing-projects.ts
 * 
 * Options:
 *   --dry-run   Show what would be updated without making changes
 *   --auto-approve-all   Auto-approve both acceptance and engagement letter
 *   --acceptance-only    Only approve acceptance (requires manual engagement letter)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationOptions {
  dryRun: boolean;
  autoApproveAll: boolean;
  acceptanceOnly: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    autoApproveAll: args.includes('--auto-approve-all'),
    acceptanceOnly: args.includes('--acceptance-only'),
  };

  console.log('🚀 Client Project Acceptance Migration Script\n');
  console.log('Options:');
  console.log(`  Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`  Auto Approve All: ${options.autoApproveAll ? 'YES' : 'NO'}`);
  console.log(`  Acceptance Only: ${options.acceptanceOnly ? 'YES' : 'NO'}\n`);

  // Find all client projects (projects with clientId)
  const clientProjects = await prisma.project.findMany({
    where: {
      clientId: {
        not: null,
      },
    },
    include: {
      Client: {
        select: {
          clientCode: true,
          clientNameFull: true,
        },
      },
      ProjectUser: {
        where: {
          role: 'ADMIN',
        },
        take: 1,
        select: {
          userId: true,
        },
      },
    },
  });

  console.log(`Found ${clientProjects.length} client project(s) to migrate\n`);

  if (clientProjects.length === 0) {
    console.log('No client projects found. Exiting.');
    return;
  }

  let updatedCount = 0;
  const systemUserId = 'SYSTEM_MIGRATION';

  for (const project of clientProjects) {
    const adminUserId = project.ProjectUser[0]?.userId || systemUserId;
    const clientName = project.Client?.clientNameFull || project.Client?.clientCode || 'Unknown';

    console.log(`\n📋 Project: ${project.name} (ID: ${project.id})`);
    console.log(`   Client: ${clientName}`);
    console.log(`   Type: ${project.projectType}`);
    console.log(`   Current Status:`);
    console.log(`     - Acceptance Approved: ${project.acceptanceApproved ? 'YES' : 'NO'}`);
    console.log(`     - Engagement Letter Uploaded: ${project.engagementLetterUploaded ? 'YES' : 'NO'}`);

    // Determine what needs to be updated
    const needsAcceptance = !project.acceptanceApproved;
    const needsEngagement = !project.engagementLetterUploaded && !options.acceptanceOnly;

    if (!needsAcceptance && !needsEngagement) {
      console.log('   ✅ Already complete - skipping');
      continue;
    }

    if (options.dryRun) {
      console.log('   🔍 DRY RUN - Would update:');
      if (needsAcceptance) {
        console.log('     - Approve acceptance');
      }
      if (needsEngagement && options.autoApproveAll) {
        console.log('     - Mark engagement letter as complete');
      }
    } else {
      try {
        const updateData: any = {};

        if (needsAcceptance) {
          updateData.acceptanceApproved = true;
          updateData.acceptanceApprovedBy = adminUserId;
          updateData.acceptanceApprovedAt = new Date();
        }

        if (needsEngagement && options.autoApproveAll) {
          updateData.engagementLetterGenerated = true;
          updateData.engagementLetterUploaded = true;
          updateData.engagementLetterUploadedBy = adminUserId;
          updateData.engagementLetterUploadedAt = new Date();
          updateData.engagementLetterPath = 'legacy/migrated';
        }

        await prisma.project.update({
          where: { id: project.id },
          data: updateData,
        });

        updatedCount++;
        console.log('   ✅ Updated successfully');
      } catch (error) {
        console.error('   ❌ Error updating project:', error);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total Projects: ${clientProjects.length}`);
  if (!options.dryRun) {
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${clientProjects.length - updatedCount}`);
  } else {
    console.log(`   This was a DRY RUN - no changes were made`);
    console.log(`   Run without --dry-run to apply changes`);
  }

  console.log('\n✨ Migration complete!\n');
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

