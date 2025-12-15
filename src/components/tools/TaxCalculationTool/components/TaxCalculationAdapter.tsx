/**
 * Tax Calculation Adapter
 * Wraps the TaxCalculationPage component for use within the TaxCalculationTool
 */

import TaxCalculationPage from '@/app/dashboard/tasks/[id]/tax-calculation/page';

interface TaxCalculationAdapterProps {
  taskId: string;
}

export function TaxCalculationAdapter({ taskId }: TaxCalculationAdapterProps) {
  return <TaxCalculationPage params={{ id: taskId }} />;
}

