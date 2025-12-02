/**
 * Business Development Conversion Service
 * Handles converting BD opportunities to clients and projects
 */

import { prisma } from '@/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface ConversionResult {
  client: {
    id: number;
    clientCode: string;
    clientNameFull: string | null;
  };
  project?: {
    id: number;
    name: string;
  };
  opportunity: {
    id: number;
    convertedToClientId: number;
    convertedAt: Date;
  };
}

/**
 * Convert a BD opportunity to a Client (and optionally a Project)
 */
export async function convertOpportunityToClient(
  opportunityId: number,
  userId: string,
  options: {
    createProject?: boolean;
    projectType?: string;
    projectName?: string;
    projectDescription?: string;
  } = {}
): Promise<ConversionResult> {
  const { createProject = false, projectType, projectName, projectDescription } = options;

  // Get the opportunity
  const opportunity = await prisma.bDOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      BDContact: true,
    },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  if (opportunity.status !== 'WON') {
    throw new Error('Can only convert won opportunities to clients');
  }

  if (opportunity.convertedToClientId) {
    throw new Error('Opportunity has already been converted to a client');
  }

  // Check if client already exists by company name
  let client = await prisma.client.findFirst({
    where: {
      clientNameFull: opportunity.companyName || undefined,
    },
  });

  // If client doesn't exist, create it
  if (!client) {
    if (!opportunity.companyName) {
      throw new Error('Cannot convert opportunity without a company name');
    }
    // Generate a unique client code
    const clientCode = await generateClientCode(opportunity.companyName);

    client = await prisma.client.create({
      data: {
        clientCode,
        clientNameFull: opportunity.companyName,
        groupCode: clientCode, // Use same as client code initially
        groupDesc: opportunity.companyName,
        clientPartner: 'TBD', // To be determined
        clientManager: 'TBD',
        clientIncharge: 'TBD',
        active: 'Yes',
        clientDateOpen: new Date(),
        industry: opportunity.BDContact?.industry || null,
        sector: opportunity.BDContact?.sector || null,
        clientOCFlag: false,
        clientTaxFlag: opportunity.serviceLine === 'TAX',
        clientSecFlag: false,
        creditor: false,
        rolePlayer: false,
        typeCode: 'STD',
        typeDesc: 'Standard Client',
        ClientID: crypto.randomUUID(),
      },
    });
  }

  // Update the opportunity to mark it as converted
  const updatedOpportunity = await prisma.bDOpportunity.update({
    where: { id: opportunityId },
    data: {
      convertedToClientId: client.id,
      convertedAt: new Date(),
    },
  });

  let project;
  if (createProject && projectType) {
    // Create an initial project for this client
    const finalProjectName = projectName || `${opportunity.title} - ${opportunity.companyName}`;

    project = await prisma.project.create({
      data: {
        name: finalProjectName,
        description: projectDescription || opportunity.description,
        clientId: client.id,
        serviceLine: opportunity.serviceLine,
        projectType,
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    });
  }

  const result: ConversionResult = {
    client: {
      id: client.id,
      clientCode: client.clientCode,
      clientNameFull: client.clientNameFull,
    },
    opportunity: {
      id: updatedOpportunity.id,
      convertedToClientId: updatedOpportunity.convertedToClientId!,
      convertedAt: updatedOpportunity.convertedAt!,
    },
  };

  if (project) {
    result.project = {
      id: project.id,
      name: project.name,
    };
  }

  return result;
}

/**
 * Generate a unique client code based on company name
 */
async function generateClientCode(companyName: string): Promise<string> {
  // Extract up to 5 characters from company name (alphanumeric only)
  const baseCode = companyName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase();

  // Try the base code first
  let clientCode = baseCode;
  let counter = 1;

  // Check if code exists, if so, append numbers
  while (await prisma.client.findUnique({ where: { clientCode } })) {
    clientCode = `${baseCode}${counter}`;
    counter++;

    // Safety limit
    if (counter > 9999) {
      throw new Error('Could not generate unique client code');
    }
  }

  return clientCode;
}

/**
 * Get conversion statistics
 */
export async function getConversionStats(filters: {
  serviceLine?: string;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<{
  totalWon: number;
  totalConverted: number;
  conversionRate: number;
  avgDaysToConvert: number;
}> {
  const { serviceLine, assignedTo, fromDate, toDate } = filters;

  const where: any = {
    status: 'WON',
    ...(serviceLine && { serviceLine }),
    ...(assignedTo && { assignedTo }),
    ...(fromDate && { convertedAt: { gte: fromDate } }),
    ...(toDate && { convertedAt: { lte: toDate } }),
  };

  const [totalWon, totalConverted] = await Promise.all([
    prisma.bDOpportunity.count({ where }),
    prisma.bDOpportunity.count({
      where: {
        ...where,
        convertedToClientId: { not: null },
      },
    }),
  ]);

  const conversionRate = totalWon > 0 ? (totalConverted / totalWon) * 100 : 0;

  // Calculate average days to convert
  const convertedOpportunities = await prisma.bDOpportunity.findMany({
    where: {
      ...where,
      convertedToClientId: { not: null },
      convertedAt: { not: null },
    },
    select: {
      createdAt: true,
      convertedAt: true,
    },
  });

  let totalDays = 0;
  for (const opp of convertedOpportunities) {
    if (opp.convertedAt) {
      const days = Math.floor(
        (opp.convertedAt.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalDays += days;
    }
  }

  const avgDaysToConvert =
    convertedOpportunities.length > 0 ? totalDays / convertedOpportunities.length : 0;

  return {
    totalWon,
    totalConverted,
    conversionRate,
    avgDaysToConvert,
  };
}

/**
 * Revert a conversion (unlink opportunity from client)
 * Note: This does NOT delete the client or project, just removes the link
 */
export async function revertConversion(opportunityId: number): Promise<void> {
  const opportunity = await prisma.bDOpportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  if (!opportunity.convertedToClientId) {
    throw new Error('Opportunity has not been converted');
  }

  await prisma.bDOpportunity.update({
    where: { id: opportunityId },
    data: {
      convertedToClientId: null,
      convertedAt: null,
    },
  });
}

