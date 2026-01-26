'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, FileText, Settings } from 'lucide-react';
import { DocumentCard, DocumentFilterBar, ServiceLineVaultAdmin, DocumentDetailModal } from '@/components/features/document-vault';
import { LoadingSpinner } from '@/components/ui';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';
import { useCurrentUser, useUserServiceLineRole } from '@/hooks/auth/usePermissions';
import type { VaultDocumentListItemDTO } from '@/types/documentVault';

export function DocumentLibraryClient() {
  const searchParams = useSearchParams();
  const serviceLine = searchParams.get('serviceLine');
  const { data: currentUser } = useCurrentUser();
  const { data: serviceLineRole } = useUserServiceLineRole(serviceLine);
  
  const [activeTab, setActiveTab] = useState<'documents' | 'admin'>('documents');
  const [documents, setDocuments] = useState<VaultDocumentListItemDTO[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>(
    serviceLine ? { serviceLine: serviceLine.toUpperCase() } : {}
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  // Check if user can administer documents for this service line (MANAGER+ roles)
  const isSystemAdmin = currentUser?.systemRole === 'SYSTEM_ADMIN';
  const isServiceLineAdmin = serviceLine && serviceLineRole && hasServiceLineRole(serviceLineRole, 'MANAGER');
  const canAdminister = isSystemAdmin || isServiceLineAdmin;

  // Fetch categories
  useEffect(() => {
    fetch('/api/document-vault/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.data.map((cat: any) => ({ id: cat.id, name: cat.name })));
        }
      })
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Fetch documents
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    fetch(`/api/document-vault?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDocuments(data.data.documents);
        } else {
          setError(data.error || 'Failed to load documents');
        }
      })
      .catch(err => {
        setError('Failed to load documents');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [filters]);

  const pageTitle = serviceLine 
    ? `${formatServiceLineName(serviceLine)} Vault`
    : 'Vault';

  const pageDescription = serviceLine
    ? `Access ${formatServiceLineName(serviceLine)} policies, procedures, templates, and documents`
    : 'Access firm policies, procedures, templates, marketing materials, and training documents';

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        {serviceLine && (
          <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
            <Link 
              href="/dashboard" 
              className="hover:text-forvis-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
            >
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link 
              href={`/dashboard/${serviceLine.toLowerCase()}`}
              className="hover:text-forvis-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
            >
              {formatServiceLineName(serviceLine)}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-forvis-gray-900 font-medium">Vault</span>
          </nav>
        )}

        {/* Header */}
        <div 
          className="rounded-lg shadow-corporate overflow-hidden mb-6"
          style={serviceLine ? { 
            background: 'linear-gradient(to right, #2E5AAC, #25488A)' 
          } : {}}
        >
          <div className="px-6 py-6">
            <h1 className={`text-3xl font-semibold ${serviceLine ? 'text-white' : 'text-forvis-gray-900'}`}>
              {pageTitle}
            </h1>
            <p className={`mt-2 text-sm ${serviceLine ? 'text-white/90' : 'text-forvis-gray-600'}`}>
              {pageDescription}
            </p>
          </div>
        </div>

        {/* Tabs (only show if service line context and user can administer) */}
        {serviceLine && canAdminister && (
          <div className="border-b border-forvis-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'documents'
                    ? 'border-forvis-blue-500 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                Documents
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'border-forvis-blue-500 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
                Admin
              </button>
            </nav>
          </div>
        )}

        {/* Documents Tab Content */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow-corporate p-6">
            {isLoading && documents.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Filters */}
                <DocumentFilterBar
                  onFilterChange={(newFilters) => {
                    setFilters({
                      ...newFilters,
                      ...(serviceLine ? { serviceLine: serviceLine.toUpperCase() } : {}),
                    });
                  }}
                  categories={categories}
                />

                {/* Document Grid */}
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-forvis-gray-600">No documents found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map(doc => (
                      <DocumentCard 
                        key={doc.id} 
                        document={doc} 
                        onClick={(id) => setSelectedDocumentId(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin Tab Content */}
        {activeTab === 'admin' && serviceLine && canAdminister && (
          <ServiceLineVaultAdmin 
            serviceLine={serviceLine.toUpperCase()} 
            isSystemAdmin={isSystemAdmin}
          />
        )}
      </div>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        isOpen={selectedDocumentId !== null}
        onClose={() => setSelectedDocumentId(null)}
        documentId={selectedDocumentId}
      />
    </div>
  );
}
