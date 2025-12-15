/**
 * Opinion Drafting Adapter
 * Wraps the OpinionDraftingPage component for use within the TaxAdvisoryTool
 */

import OpinionDraftingPage from '@/app/dashboard/tasks/[id]/opinion-drafting/page';

interface OpinionDraftingAdapterProps {
  taskId: string;
}

export function OpinionDraftingAdapter({ taskId }: OpinionDraftingAdapterProps) {
  return <OpinionDraftingPage params={{ id: taskId }} />;
}

