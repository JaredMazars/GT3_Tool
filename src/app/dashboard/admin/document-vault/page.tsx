import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { AdminDocumentVaultClient } from './AdminDocumentVaultClient';

export const metadata = {
  title: 'Manage Vault | Mapper',
  description: 'Admin interface for managing firm documents',
};

export default function AdminDocumentVaultPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-forvis-gray-900">Vault Administration</h1>
            <p className="mt-2 text-sm text-forvis-gray-600">
              Manage firm policies, procedures, templates, and documents
            </p>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={<LoadingSpinner />}>
          <AdminDocumentVaultClient />
        </Suspense>
      </div>
    </div>
  );
}
