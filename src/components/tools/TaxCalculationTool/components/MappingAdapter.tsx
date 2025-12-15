/**
 * Mapping Adapter
 * Wraps the MappingPage component for use within the TaxCalculationTool
 */

import MappingPage from '@/app/dashboard/tasks/[id]/mapping/page';

interface MappingAdapterProps {
  taskId: string;
}

export function MappingAdapter({ taskId }: MappingAdapterProps) {
  return <MappingPage params={{ id: taskId }} />;
}

