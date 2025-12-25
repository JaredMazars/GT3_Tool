import type { ToolConfig } from '../registry/types';

export const taxCalculationToolConfig: ToolConfig = {
  id: 'tax-calculation',
  name: 'Tax Calculation Tool',
  description:
    'Comprehensive tax calculation and adjustment management for South African corporate income tax (IT14)',
  serviceLines: ['TAX'],
  apiRoutes: {
    basePath: '/api/tasks/[id]/tax',
    endpoints: [
      'tax-calculation',
      'tax-calculation/export',
      'tax-adjustments',
      'tax-adjustments/[adjustmentId]',
      'tax-adjustments/[adjustmentId]/documents',
      'tax-adjustments/[adjustmentId]/extract',
    ],
  },
  permissions: {
    feature: 'tasks.view',
    taskRole: 'VIEWER',
  },
  enabled: true,
  version: '1.0.0',
};
