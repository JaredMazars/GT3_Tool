/**
 * News Bulletin AI Generation API
 * POST /api/news/generate - Generate bulletin body content using AI
 */

import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';
import { z } from 'zod';

const GenerateBulletinBodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  category: z.string().optional(),
  tone: z.enum(['formal', 'friendly', 'urgent']).optional().default('formal'),
}).strict();

/**
 * POST /api/news/generate
 * Generate bulletin body content using AI
 */
export const POST = secureRoute.ai({
  schema: GenerateBulletinBodySchema,
  handler: async (request, { user, data }) => {
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to generate bulletin content' },
        { status: 403 }
      );
    }

    const toneInstructions = {
      formal: 'Use a professional, formal tone appropriate for corporate communications.',
      friendly: 'Use a warm, approachable tone that feels personal yet professional.',
      urgent: 'Use a clear, direct tone that conveys importance and urgency.',
    };

    const categoryContext = data.category
      ? `This is a ${data.category.replace('_', ' ').toLowerCase()} bulletin.`
      : '';

    const prompt = `You are a professional corporate communications writer for a professional services firm.

Generate the body content for a company news bulletin based on the following:

**Title:** ${data.title}

**Summary:** ${data.summary}

${categoryContext}

**Tone:** ${toneInstructions[data.tone]}

**Requirements:**
- Write 2-4 paragraphs of engaging, well-structured content
- Expand on the summary with relevant details
- Keep the content informative and professional
- Do not include the title or summary in your response - only the body content
- Use clear, concise language
- If the bulletin relates to an achievement or success, be celebratory but professional
- If it's a policy update or announcement, be clear and direct
- End with a forward-looking statement or call to action if appropriate

Generate the bulletin body content now:`;

    logger.info('Generating bulletin body content', {
      userId: user.id,
      title: data.title.substring(0, 50),
    });

    const result = await generateText({
      model: models.mini,
      prompt,
      ...getModelParams({ maxTokens: 1000 }),
    });

    if (!result.text) {
      throw new Error('AI generation returned empty response');
    }

    logger.info('Bulletin body content generated successfully', {
      userId: user.id,
      contentLength: result.text.length,
    });

    return NextResponse.json(
      successResponse({
        body: result.text.trim(),
        usage: result.usage,
      })
    );
  },
});
