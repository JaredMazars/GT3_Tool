/**
 * Income Statement Adapter
 * Wraps the IncomeStatementPage component for use within the TaxCalculationTool
 */

import IncomeStatementPage from '@/app/dashboard/tasks/[id]/income-statement/page';

interface IncomeStatementAdapterProps {
  taskId: string;
}

export function IncomeStatementAdapter({ taskId }: IncomeStatementAdapterProps) {
  return <IncomeStatementPage params={{ id: taskId }} />;
}

