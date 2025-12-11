import { TaskType } from '@/types';
import type { ToolConfig } from '../registry/types';

export const taxCalculationToolConfig: ToolConfig = {
  id: 'tax-calculation',
  name: 'Tax Calculation Tool',
  description:
    'Comprehensive tax calculation and adjustment management for South African corporate income tax (IT14)',
  taskTypes: [TaskType.TAX_CALCULATION, TaskType.TAX_OPINION],
  apiRoutes: {
    basePath: '/api/tasks/[id]/tax',
    endpoints: [
      'tax-calculation',
      'tax-calculation/export',
      'tax-adjustments',
      'tax-adjustments/[adjustmentId]',
      'tax-adjustments/suggestions',
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



















