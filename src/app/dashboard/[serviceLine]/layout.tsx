/**
 * Service Line Layout
 * Wraps service line pages with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface ServiceLineLayoutProps {
  children: ReactNode;
  params: Promise<{ serviceLine: string }>;
}

export default async function ServiceLineLayout({
  children,
}: ServiceLineLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}


