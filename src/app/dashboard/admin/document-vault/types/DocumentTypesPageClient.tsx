'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Tag, FolderOpen, FileText, FileCheck, Megaphone, GraduationCap, HelpCircle, Settings } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { DocumentTypeFormModal } from '@/components/features/document-vault/DocumentTypeFormModal';
import { DeleteDocumentTypeModal } from '@/components/features/document-vault/DeleteDocumentTypeModal';

export function DocumentTypesPageClient() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [typeToDelete, setTypeToDelete] = useState<any>(null);
  const [togglingTypeId, setTogglingTypeId] = useState<number | null>(null);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/document-vault/types');
      const data = await response.json();
      
      if (data.success) {
        setTypes(data.data);
      } else {
        setError(data.error || 'Failed to load document types');
      }
    } catch (err) {
      setError('Failed to load document types');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleCreateClick = () => {
    setSelectedType(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (type: any) => {
    setSelectedType(type);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (type: any) => {
    setTypeToDelete({
      id: type.id,
      code: type.code,
      name: type.name,
      documentCount: type.documentCount,
    });
    setIsDeleteModalOpen(true);
  };

  const handleToggleActive = async (typeId: number, currentActive: boolean) => {
    setTogglingTypeId(typeId);
    try {
      const response = await fetch(`/api/admin/document-vault/types/${typeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update document type');
      }

      // Update local state
      setTypes(types.map(type => 
        type.id === typeId ? { ...type, active: !currentActive } : type
      ));

      showSuccessMessage(`Document type ${!currentActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to update document type status');
    } finally {
      setTogglingTypeId(null);
    }
  };

  const handleFormSuccess = () => {
    fetchTypes();
    showSuccessMessage(selectedType ? 'Document type updated successfully' : 'Document type created successfully');
  };

  const handleDeleteSuccess = () => {
    fetchTypes();
    showSuccessMessage('Document type deleted successfully');
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const getIconComponent = (iconName: string | null) => {
    switch (iconName) {
      case 'FolderOpen': return FolderOpen;
      case 'FileText': return FileText;
      case 'FileCheck': return FileCheck;
      case 'Megaphone': return Megaphone;
      case 'GraduationCap': return GraduationCap;
      case 'HelpCircle': return HelpCircle;
      case 'Settings': return Settings;
      case 'Tag': return Tag;
      default: return FileText;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button variant="primary" onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Type
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            className="p-4 rounded-lg border-2"
            style={{ 
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', 
              borderColor: '#10B981' 
            }}
          >
            <p className="text-sm font-semibold text-green-900">{successMessage}</p>
          </div>
        )}

        {/* Document Types Table */}
        <div className="bg-white rounded-lg border border-forvis-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-forvis-gray-50 border-b border-forvis-gray-200">
            <h2 className="text-lg font-semibold text-forvis-gray-900">Document Types</h2>
            <p className="text-sm text-forvis-gray-600 mt-1">
              Manage document type definitions used throughout the vault system
            </p>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {types.map((type) => {
              const IconComponent = getIconComponent(type.icon);
              return (
                <div key={type.id} className="px-6 py-4 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    {type.color && (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: type.color }}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-forvis-gray-900">{type.name}</div>
                        <code className="text-xs px-2 py-0.5 bg-forvis-gray-100 text-forvis-gray-700 rounded font-mono">
                          {type.code}
                        </code>
                        <span className="text-xs text-forvis-gray-500">#{type.sortOrder}</span>
                      </div>
                      {type.description && (
                        <div className="text-xs text-forvis-gray-600 mt-0.5 line-clamp-1">{type.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-forvis-gray-600 whitespace-nowrap">
                      {type.documentCount} docs
                    </span>
                    
                    {/* Active Status Badge - Clickable to toggle */}
                    <button
                      onClick={() => handleToggleActive(type.id, type.active)}
                      disabled={togglingTypeId === type.id}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                        type.active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      title="Click to toggle active status"
                    >
                      {togglingTypeId === type.id ? (
                        <span className="flex items-center gap-1">
                          <LoadingSpinner size="sm" />
                        </span>
                      ) : (
                        type.active ? 'Active' : 'Inactive'
                      )}
                    </button>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(type)}
                        className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-lg transition-colors"
                        title="Edit document type"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(type)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {types.length === 0 && (
          <div className="text-center py-12">
            <p className="text-forvis-gray-600 mb-4">No document types found</p>
            <Button variant="primary" onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Type
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <DocumentTypeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        documentType={selectedType}
      />

      <DeleteDocumentTypeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
        documentType={typeToDelete}
      />
    </>
  );
}
