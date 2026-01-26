import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { DocumentDetailClient } from './DocumentDetailClient';

export const metadata = {
  title: 'Vault Document | Mapper',
};

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<LoadingSpinner />}>
        <DocumentDetailClient documentId={params.id} />
      </Suspense>
    </div>
  );
}
