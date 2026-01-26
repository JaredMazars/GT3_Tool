/**
 * Notifications Layout
 * Wraps notifications page with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface NotificationsLayoutProps {
  children: ReactNode;
}

export default async function NotificationsLayout({ children }: NotificationsLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}

