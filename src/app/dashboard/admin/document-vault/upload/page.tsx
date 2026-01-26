import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { UploadPageClient } from './UploadPageClient';

export const metadata = {
  title: 'Upload to Vault | Mapper',
};

export default function UploadDocumentPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-forvis-gray-900">Upload to Vault</h1>
          <p className="mt-2 text-sm text-forvis-gray-600">
            Upload a new document to the vault
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-forvis-gray-200 p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <UploadPageClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
