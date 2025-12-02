import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_STAGES = [
  {
    name: 'Lead',
    description: 'Initial contact or lead received',
    order: 1,
    probability: 10,
    color: '#94a3b8', // gray
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Qualified',
    description: 'Lead has been qualified as a real opportunity',
    order: 2,
    probability: 25,
    color: '#60a5fa', // blue
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Proposal',
    description: 'Proposal has been sent to prospect',
    order: 3,
    probability: 50,
    color: '#a78bfa', // purple
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Negotiation',
    description: 'Actively negotiating terms and pricing',
    order: 4,
    probability: 75,
    color: '#fb923c', // orange
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Won',
    description: 'Deal won - client accepted',
    order: 5,
    probability: 100,
    color: '#22c55e', // green
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Lost',
    description: 'Deal lost or rejected',
    order: 6,
    probability: 0,
    color: '#ef4444', // red
    isDefault: true,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding default BD stages...');

  // Create default stages (applicable to all service lines - serviceLine = null)
  for (const stage of DEFAULT_STAGES) {
    const existing = await prisma.bDStage.findFirst({
      where: {
        name: stage.name,
        serviceLine: null,
      },
    });

    if (existing) {
      console.log(`Stage "${stage.name}" already exists, skipping...`);
      continue;
    }

    await prisma.bDStage.create({
      data: {
        ...stage,
        serviceLine: null, // Default stages apply to all service lines
        updatedAt: new Date(),
      },
    });

    console.log(`Created stage: ${stage.name} (${stage.probability}%)`);
  }

  console.log('\nSeeding complete!');
  console.log(`Created ${DEFAULT_STAGES.length} default BD stages`);
}

main()
  .catch((e) => {
    console.error('Error seeding BD stages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

