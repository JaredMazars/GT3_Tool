/**
 * Business Development News Layout
 * Wraps news page with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface NewsLayoutProps {
  children: ReactNode;
}

export default async function NewsLayout({ children }: NewsLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}

