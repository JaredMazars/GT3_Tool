/**
 * Tax Compliance Tool Configuration
 * This tool provides SARS correspondence, compliance, and filing management
 */

import type { ToolModuleConfig } from '../types.server';

export const taxComplianceToolConfig: ToolModuleConfig = {
  code: 'TAX_COMP',
  name: 'Tax Compliance',
  description: 'Manage SARS correspondence, compliance, and filing',
  version: '1.0.0',
  defaultSubTabs: [
    {
      id: 'sars-responses',
      label: 'SARS Responses',
      icon: 'Mail',
    },
    {
      id: 'document-management',
      label: 'Documents',
      icon: 'Folder',
    },
    {
      id: 'compliance-checklist',
      label: 'Compliance Checklist',
      icon: 'ClipboardCheck',
    },
    {
      id: 'filing-status',
      label: 'Filing Status',
      icon: 'FileCheck',
    },
  ],
};

