/**
 * Document Vault Layout
 * Wraps document vault pages with PageAccessGuard
 */

import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageAccessGuard } from '@/components/guards/PageAccessGuard';

interface DocumentVaultLayoutProps {
  children: ReactNode;
}

export default async function DocumentVaultLayout({ 
  children 
}: DocumentVaultLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard/document-vault';

  return (
    <PageAccessGuard pathname={pathname}>
      {children}
    </PageAccessGuard>
  );
}
