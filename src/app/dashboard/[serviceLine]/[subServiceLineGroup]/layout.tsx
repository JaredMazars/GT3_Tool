/**
 * Workspace Layout
 * Wraps workspace and nested pages with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}

