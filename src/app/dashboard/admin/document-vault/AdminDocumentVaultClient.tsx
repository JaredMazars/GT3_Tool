'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Settings, FileText, Clock, Archive, Edit } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { ApproverDisplay, EditDocumentModal, SubmitDocumentModal } from '@/components/features/document-vault';
import Link from 'next/link';

export function AdminDocumentVaultClient() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<any | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [documentToSubmit, setDocumentToSubmit] = useState<{ id: number; title: string; documentType?: string; version?: number } | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, [activeTab]);

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
      const params = new URLSearchParams();
      if (activeTab === 'pending') params.append('status', 'PENDING_APPROVAL');
      if (activeTab === 'archived') params.append('status', 'ARCHIVED');

      const response = await fetch(`/api/admin/document-vault?${params}`);
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

  const handleArchive = async (documentId: number) => {
    if (!confirm('Are you sure you want to archive this document?')) return;

    try {
      const response = await fetch(`/api/admin/document-vault/${documentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to archive document');
      }
    } catch (err) {
      alert('Failed to archive document');
      console.error(err);
    }
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
      <EditDocumentModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        document={documentToEdit}
        categories={categories}
        serviceLines={['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT']}
      />

      <SubmitDocumentModal
        isOpen={submitModalOpen}
        onClose={handleSubmitClose}
        onSuccess={handleSubmitSuccess}
        document={documentToSubmit}
        isServiceLine={false}
      />
      
      <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link href="/dashboard/admin/document-vault/upload">
          <Button variant="primary">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </Link>
        <Link href="/dashboard/admin/document-vault/categories">
          <Button variant="secondary">
            <Settings className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </Link>
        <Link href="/dashboard/admin/document-vault/types">
          <Button variant="secondary">
            <Settings className="h-4 w-4 mr-2" />
            Manage Document Types
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-forvis-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <FileText className="h-5 w-5 inline mr-2" />
            All Documents
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <Clock className="h-5 w-5 inline mr-2" />
            Pending Approval
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archived'
                ? 'border-forvis-blue-500 text-forvis-blue-600'
                : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
            }`}
          >
            <Archive className="h-5 w-5 inline mr-2" />
            Archived
          </button>
        </nav>
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
        <div className="text-center py-12">
          <p className="text-forvis-gray-600">No documents found</p>
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
                  Category
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
                    <Link href={`/dashboard/document-vault/${doc.id}`} className="hover:text-forvis-blue-600">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-forvis-gray-600">
                    {doc.documentType}
                  </td>
                  <td className="px-6 py-4 text-sm text-forvis-gray-600">
                    {doc.VaultDocumentCategory.name}
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
                          onClick={() => handleArchive(doc.id)}
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
    </>
  );
}
