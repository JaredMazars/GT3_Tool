import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { DocumentLibraryClient } from './DocumentLibraryClient';

export const metadata = {
  title: 'Vault | Mapper',
  description: 'Access firm policies, procedures, templates, and documents',
};

export default function DocumentVaultPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DocumentLibraryClient />
    </Suspense>
  );
}
