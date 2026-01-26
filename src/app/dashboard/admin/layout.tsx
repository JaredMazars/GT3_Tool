/**
 * Admin Layout
 * Wraps all admin pages with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Get current pathname from headers
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard/admin';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}






















