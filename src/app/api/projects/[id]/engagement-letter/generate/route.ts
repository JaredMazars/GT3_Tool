import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { toProjectId } from '@/types/branded';

/**
 * Generate engagement letter content from template
 */
function generateEngagementLetter(project: any, client: any): string {
  const currentYear = new Date().getFullYear();
  const projectYear = project.taxYear || currentYear;
  
  return `# ENGAGEMENT LETTER

**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

**To:** ${client.clientNameFull || client.clientCode}  
**Client Code:** ${client.clientCode}  
**Project:** ${project.name}

---

## 1. INTRODUCTION

This letter confirms our understanding of the terms and objectives of our engagement and the nature and limitations of the services we will provide.

## 2. SCOPE OF SERVICES

We have been engaged to provide the following services:

**Project Type:** ${project.projectType.replace(/_/g, ' ')}  
**Tax Year:** ${projectYear}  
${project.taxPeriodStart && project.taxPeriodEnd ? `**Period:** ${new Date(project.taxPeriodStart).toLocaleDateString()} to ${new Date(project.taxPeriodEnd).toLocaleDateString()}` : ''}

${project.description ? `\n**Project Description:** ${project.description}\n` : ''}

## 3. RESPONSIBILITIES

### 3.1 Our Responsibilities
- Perform the services with professional care and in accordance with applicable professional standards
- Maintain the confidentiality of your information
- Provide timely communication regarding the progress of the engagement
- Deliver work products in accordance with agreed timelines

### 3.2 Client Responsibilities
- Provide complete and accurate information required for the engagement
- Make management personnel available for consultations
- Review and approve deliverables in a timely manner
- Ensure payment of fees in accordance with agreed terms

## 4. FEES AND PAYMENT TERMS

Our fees are based on the time required by the individuals assigned to the engagement and their professional qualifications. We will bill you on a monthly basis, and payment is due within 30 days of the invoice date.

## 5. TERM AND TERMINATION

This engagement begins on the date of this letter and continues until completion of the agreed scope of work. Either party may terminate this engagement with 30 days' written notice.

## 6. CONFIDENTIALITY

We will maintain the confidentiality of your information, except as required by law or professional standards.

## 7. ACCEPTANCE

Please sign and return a copy of this letter to indicate your acceptance of the terms outlined herein.

---

**Forvis Mazars**

Partner: ${client.clientPartner || '___________________'}  
Manager: ${client.clientManager || '___________________'}

---

**Client Acceptance**

Name: ___________________  
Title: ___________________  
Signature: ___________________  
Date: ___________________

---

*This engagement letter is governed by the laws of South Africa.*
`;
}

/**
 * POST /api/projects/[id]/engagement-letter/generate
 * Generate engagement letter from template
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const projectId = toProjectId(id);

    // Check if user can generate engagement letter
    // Rules: SUPERUSER OR Partner (ServiceLineUser.role = ADMIN for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, projectId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can generate engagement letters' },
        { status: 403 }
      );
    }

    // Get project with client details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.clientId || !project.Client) {
      return NextResponse.json(
        { error: 'Engagement letter is only available for client projects' },
        { status: 400 }
      );
    }

    if (!project.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before generating engagement letter' },
        { status: 400 }
      );
    }

    // Generate the letter content
    const letterContent = generateEngagementLetter(project, project.Client);

    // Mark as generated
    await prisma.project.update({
      where: { id: projectId },
      data: {
        engagementLetterGenerated: true,
      },
    });

    return NextResponse.json(
      successResponse({
        content: letterContent,
        generated: true,
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/[id]/engagement-letter/generate');
  }
}


