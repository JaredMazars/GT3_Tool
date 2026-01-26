/**
 * Group Detail Layout
 * Wraps group detail pages with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface GroupDetailLayoutProps {
  children: ReactNode;
}

export default async function GroupDetailLayout({ children }: GroupDetailLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}

