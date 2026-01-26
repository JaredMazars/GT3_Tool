'use client';

import { useState, useEffect } from 'react';
import { Upload, Edit, Archive, FileText, Clock, X, Plus } from 'lucide-react';
import { Button, LoadingSpinner, Input } from '@/components/ui';
import { DocumentUploadForm, ApproverDisplay, ArchiveDocumentModal, EditDocumentModal, SubmitDocumentModal } from '@/components/features/document-vault';
import type { VaultDocumentType } from '@/types/documentVault';

interface ServiceLineVaultAdminProps {
  serviceLine: string; // e.g., 'TAX', 'QRM'
  isSystemAdmin: boolean;
}

export function ServiceLineVaultAdmin({ serviceLine, isSystemAdmin }: ServiceLineVaultAdminProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [documentToArchive, setDocumentToArchive] = useState<{ id: number; title: string; documentType?: string; version?: number } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<any | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [documentToSubmit, setDocumentToSubmit] = useState<{ id: number; title: string; documentType?: string; version?: number } | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch documents when switching to manage tab
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchDocuments();
    }
  }, [activeTab, statusFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/document-vault/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ serviceLine });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/document-vault/admin?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (documentId: number) => {
    setUploadSuccess(true);
    // Switch to manage tab to see the uploaded document
    setActiveTab('manage');
    // Show success message
    setTimeout(() => {
      setUploadSuccess(false);
    }, 5000);
  };

  const handleArchive = (doc: any) => {
    setDocumentToArchive({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      version: doc.version,
    });
    setArchiveModalOpen(true);
  };

  const handleArchiveSuccess = () => {
    fetchDocuments();
    setArchiveModalOpen(false);
    setDocumentToArchive(null);
  };

  const handleArchiveClose = () => {
    setArchiveModalOpen(false);
    setDocumentToArchive(null);
  };

  const handleEdit = (doc: any) => {
    setDocumentToEdit(doc);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchDocuments();
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  const handleSubmit = (doc: any) => {
    setDocumentToSubmit({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      version: doc.version,
    });
    setSubmitModalOpen(true);
  };

  const handleSubmitSuccess = () => {
    fetchDocuments();
    setSubmitModalOpen(false);
    setDocumentToSubmit(null);
  };

  const handleSubmitClose = () => {
    setSubmitModalOpen(false);
    setDocumentToSubmit(null);
  };

  return (
    <>
      <ArchiveDocumentModal
        isOpen={archiveModalOpen}
        onClose={handleArchiveClose}
        onSuccess={handleArchiveSuccess}
        document={documentToArchive}
      />
      
      <EditDocumentModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        document={documentToEdit}
        categories={categories}
        serviceLines={[serviceLine]}
      />

      <SubmitDocumentModal
        isOpen={submitModalOpen}
        onClose={handleSubmitClose}
        onSuccess={handleSubmitSuccess}
        document={documentToSubmit}
        isServiceLine={true}
      />
      
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-forvis-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Manage Documents
          </button>
        </nav>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-lg border border-forvis-gray-200 p-6">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">
            Upload New Document to {serviceLine}
          </h3>
          
          {uploadSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Document uploaded successfully and sent for approval!
            </div>
          )}

          <DocumentUploadForm
            categories={categories}
            serviceLines={[serviceLine]}
            defaultServiceLine={serviceLine}
            onSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-forvis-gray-700">
              Status:
            </label>
            <Input
              variant="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Documents' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-forvis-gray-200">
              <FileText className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <p className="mt-2 text-forvis-gray-600">No documents found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-forvis-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-forvis-gray-200">
                <thead className="bg-forvis-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Scope
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Approvers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-forvis-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-forvis-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-forvis-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        {doc.documentType}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {doc.scope === 'GLOBAL' ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300">
                            Global
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700">
                            {doc.serviceLine}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'PENDING_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-800'
                              : doc.status === 'ARCHIVED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ApproverDisplay approval={doc.Approval} />
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        v{doc.version}
                      </td>
                      <td className="px-6 py-4 text-sm text-forvis-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {doc.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSubmit(doc)}
                              >
                                Submit for Approval
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEdit(doc)}
                              >
                                Edit
                              </Button>
                            </>
                          )}
                          {doc.status !== 'ARCHIVED' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleArchive(doc)}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
