/**
 * Balance Sheet Adapter
 * Wraps the BalanceSheetPage component for use within the TaxCalculationTool
 */

import BalanceSheetPage from '@/app/dashboard/tasks/[id]/balance-sheet/page';

interface BalanceSheetAdapterProps {
  taskId: string;
}

export function BalanceSheetAdapter({ taskId }: BalanceSheetAdapterProps) {
  return <BalanceSheetPage params={{ id: taskId }} />;
}

