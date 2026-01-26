/**
 * Task Detail Layout
 * Wraps all task-related pages with PageAccessGuard
 * Protects: task detail, users, documents, tax calculation, opinions, reporting,
 * filing status, compliance, balance sheet, income statement, mapping, SARS responses
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface TaskDetailLayoutProps {
  children: ReactNode;
}

export default async function TaskDetailLayout({ children }: TaskDetailLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}

