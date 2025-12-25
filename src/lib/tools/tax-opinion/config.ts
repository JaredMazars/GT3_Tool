import type { ToolConfig } from '../registry/types';

export const taxOpinionToolConfig: ToolConfig = {
  id: 'tax-opinion',
  name: 'Tax Opinion Tool',
  description:
    'AI-powered tax opinion drafting and analysis with multi-agent workflow for South African tax law',
  serviceLines: ['TAX'],
  apiRoutes: {
    basePath: '/api/tasks/[id]',
    endpoints: [
      'ai-tax-report',
      'opinion-drafts',
      'opinion-drafts/[draftId]',
      'opinion-drafts/[draftId]/chat',
      'opinion-drafts/[draftId]/documents',
      'opinion-drafts/[draftId]/sections',
      'opinion-drafts/[draftId]/export',
      'legal-precedents',
      'research-notes',
      'research-notes/[noteId]',
    ],
  },
  permissions: {
    feature: 'tasks.view',
    taskRole: 'VIEWER',
  },
  enabled: true,
  version: '1.0.0',
};
