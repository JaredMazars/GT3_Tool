'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Plus, Edit, Trash2, FolderOpen, FileText, FileCheck, Megaphone, GraduationCap, HelpCircle, Users } from 'lucide-react';
import { Button, LoadingSpinner, Badge } from '@/components/ui';
import { CategoryFormModal } from '@/components/features/document-vault/CategoryFormModal';
import { DeleteCategoryModal } from '@/components/features/document-vault/DeleteCategoryModal';
import { CategoryApproverModal } from '@/components/features/document-vault/CategoryApproverModal';

export function CategoriesPageClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [categoryForApprovers, setCategoryForApprovers] = useState<any>(null);
  const [togglingCategoryId, setTogglingCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/document-vault/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || 'Failed to load categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleCreateClick = () => {
    setSelectedCategory(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (category: any) => {
    setSelectedCategory(category);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (category: any) => {
    setCategoryToDelete({
      id: category.id,
      name: category.name,
      documentCount: category.documentCount,
    });
    setIsDeleteModalOpen(true);
  };

  const handleManageApprovers = (category: any) => {
    setCategoryForApprovers({
      id: category.id,
      name: category.name,
    });
    setIsApproverModalOpen(true);
  };

  const handleToggleActive = async (categoryId: number, currentActive: boolean) => {
    setTogglingCategoryId(categoryId);
    try {
      const response = await fetch(`/api/admin/document-vault/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      // Update local state
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, active: !currentActive } : cat
      ));

      showSuccessMessage(`Category ${!currentActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to update category status');
    } finally {
      setTogglingCategoryId(null);
    }
  };

  const handleFormSuccess = () => {
    fetchCategories();
    showSuccessMessage(selectedCategory ? 'Category updated successfully' : 'Category created successfully');
  };

  const handleDeleteSuccess = () => {
    fetchCategories();
    showSuccessMessage('Category deleted successfully');
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
      default: return FolderOpen;
    }
  };

  // Group categories by document type
  const groupedCategories = categories.reduce((acc, cat) => {
    const type = cat.documentType || 'General';
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {} as Record<string, any[]>);

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
            Add New Category
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

        {/* Categories by Type */}
        {Object.entries(groupedCategories).map(([type, cats]) => (
          <div key={type} className="bg-white rounded-lg border border-forvis-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-forvis-gray-50 border-b border-forvis-gray-200">
              <h2 className="text-lg font-semibold text-forvis-gray-900">{type} Categories</h2>
            </div>
            <div className="divide-y divide-forvis-gray-200">
              {(cats as any[]).map((cat) => {
                const IconComponent = getIconComponent(cat.icon);
                return (
                  <div key={cat.id} className="px-6 py-4 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      {cat.color && (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-forvis-gray-900">{cat.name}</div>
                          <span className="text-xs text-forvis-gray-500">#{cat.sortOrder}</span>
                        </div>
                        {cat.description && (
                          <div className="text-xs text-forvis-gray-600 mt-0.5 line-clamp-1">{cat.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Approver Count */}
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-forvis-gray-600" />
                        <span className={`text-sm whitespace-nowrap ${
                          cat.approverCount === 0 ? 'text-red-600 font-medium' : 'text-forvis-gray-600'
                        }`}>
                          {cat.approverCount} approver{cat.approverCount !== 1 ? 's' : ''}
                        </span>
                        {cat.approverCount === 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full ml-1">
                            Required
                          </span>
                        )}
                      </div>

                      <span className="text-sm text-forvis-gray-400">|</span>

                      <span className="text-sm text-forvis-gray-600 whitespace-nowrap">
                        {cat.documentCount} docs
                      </span>
                      
                      {/* Active Status Badge - Clickable to toggle */}
                      <button
                        onClick={() => handleToggleActive(cat.id, cat.active)}
                        disabled={togglingCategoryId === cat.id}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                          cat.active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        {togglingCategoryId === cat.id ? (
                          <span className="flex items-center gap-1">
                            <LoadingSpinner size="sm" />
                          </span>
                        ) : (
                          cat.active ? 'Active' : 'Inactive'
                        )}
                      </button>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleManageApprovers(cat)}
                          className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-lg transition-colors"
                          title="Manage approvers"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(cat)}
                          className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(cat)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete category"
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
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-forvis-gray-600 mb-4">No categories found</p>
            <Button variant="primary" onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Category
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        category={selectedCategory}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
        category={categoryToDelete}
      />

      {categoryForApprovers && (
        <CategoryApproverModal
          isOpen={isApproverModalOpen}
          onClose={() => setIsApproverModalOpen(false)}
          category={categoryForApprovers}
          onSuccess={() => {
            fetchCategories();
            showSuccessMessage('Approvers updated successfully');
          }}
        />
      )}
    </>
  );
}
