/**
 * Tax Advisory Tool Configuration
 * This tool provides tax opinion drafting and advisory document management
 */

import type { ToolModuleConfig } from '../types.server';

export const taxAdvisoryToolConfig: ToolModuleConfig = {
  code: 'TAX_ADV',
  name: 'Tax Advisory',
  description: 'Draft and manage tax opinions and advisory documents',
  version: '1.0.0',
  defaultSubTabs: [
    {
      id: 'tax-opinion',
      label: 'Tax Opinion',
      icon: 'BookOpen',
    },
  ],
};

