import { DocumentTypesPageClient } from './DocumentTypesPageClient';

export const metadata = {
  title: 'Manage Document Types | Forvis Mazars',
  description: 'Manage document type definitions for the vault system',
};

export default function DocumentTypesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-forvis-gray-900">Manage Document Types</h1>
        <p className="text-forvis-gray-600 mt-2">
          Define and manage document type classifications for the vault system
        </p>
      </div>
      <DocumentTypesPageClient />
    </div>
  );
}
