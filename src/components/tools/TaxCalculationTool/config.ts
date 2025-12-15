/**
 * Tax Calculation Tool Configuration
 * This tool provides comprehensive tax calculation and adjustment management
 */

import type { ToolModuleConfig } from '../types.server';

export const taxCalculationToolConfig: ToolModuleConfig = {
  code: 'TAX_CALC',
  name: 'Tax Calculation',
  description: 'Complete tax return calculations and reporting',
  version: '1.0.0',
  defaultSubTabs: [
    {
      id: 'mapping',
      label: 'Mapping',
      icon: 'Table',
    },
    {
      id: 'balance-sheet',
      label: 'Balance Sheet',
      icon: 'FileText',
    },
    {
      id: 'income-statement',
      label: 'Income Statement',
      icon: 'FileText',
    },
    {
      id: 'tax-calculation',
      label: 'Tax Calculation',
      icon: 'Calculator',
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: 'ClipboardList',
    },
  ],
};

