import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { CategoriesPageClient } from './CategoriesPageClient';

export const metadata = {
  title: 'Manage Vault Categories | Mapper',
};

export default function DocumentCategoriesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-forvis-gray-900">Vault Categories</h1>
          <p className="mt-2 text-sm text-forvis-gray-600">
            Manage categories for organizing vault documents
          </p>
        </div>

        {/* Content */}
        <Suspense fallback={<LoadingSpinner />}>
          <CategoriesPageClient />
        </Suspense>
      </div>
    </div>
  );
}
