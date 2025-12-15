/**
 * Reporting Adapter
 * Wraps the ReportingPage component for use within the TaxCalculationTool
 */

import ReportingPage from '@/app/dashboard/tasks/[id]/reporting/page';

interface ReportingAdapterProps {
  taskId: string;
}

export function ReportingAdapter({ taskId }: ReportingAdapterProps) {
  return <ReportingPage params={{ id: taskId }} />;
}

