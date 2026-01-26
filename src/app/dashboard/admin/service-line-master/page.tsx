'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Search,
  BarChart3,
  CheckCircle,
  XCircle,
  Database,
} from 'lucide-react';
import { AlertModal } from '@/components/shared/AlertModal';
import { Button, Input, LoadingSpinner } from '@/components/ui';

interface ServiceLineMaster {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type ModalMode = 'create' | 'edit' | null;

interface FormData {
  code: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

export default function ServiceLineMasterPage() {
  const [serviceLines, setServiceLines] = useState<ServiceLineMaster[]>([]);
  const [filteredServiceLines, setFilteredServiceLines] = useState<ServiceLineMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: '',
    active: true,
    sortOrder: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    fetchServiceLines();
  }, []);

  useEffect(() => {
    filterServiceLines();
  }, [serviceLines, searchTerm, filterActive]);

  const fetchServiceLines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/service-line-master');
      const data = await response.json();

      if (data.success) {
        setServiceLines(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch service lines');
      }
    } catch (error) {
      console.error('Failed to fetch service lines:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load service lines. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterServiceLines = () => {
    let filtered = [...serviceLines];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (sl) =>
          sl.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sl.description && sl.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply active filter
    if (filterActive !== 'all') {
      filtered = filtered.filter((sl) => sl.active === (filterActive === 'active'));
    }

    setFilteredServiceLines(filtered);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCode(null);
    const nextSortOrder = serviceLines.length > 0 
      ? Math.max(...serviceLines.map(sl => sl.sortOrder)) + 1 
      : 0;
    setFormData({
      code: '',
      name: '',
      description: '',
      active: true,
      sortOrder: nextSortOrder,
    });
  };

  const openEditModal = (serviceLine: ServiceLineMaster) => {
    setModalMode('edit');
    setSelectedCode(serviceLine.code);
    setFormData({
      code: serviceLine.code,
      name: serviceLine.name,
      description: serviceLine.description || '',
      active: serviceLine.active,
      sortOrder: serviceLine.sortOrder,
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCode(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      active: true,
      sortOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = modalMode === 'create'
        ? '/api/admin/service-line-master'
        : `/api/admin/service-line-master/${selectedCode}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const payload = modalMode === 'create'
        ? {
            code: formData.code,
            name: formData.name,
            description: formData.description || null,
            active: formData.active,
            sortOrder: formData.sortOrder,
          }
        : {
            name: formData.name,
            description: formData.description || null,
            active: formData.active,
            sortOrder: formData.sortOrder,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${modalMode} service line`);
      }

      await fetchServiceLines();
      closeModal();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: `Service line ${modalMode === 'create' ? 'created' : 'updated'} successfully`,
        variant: 'success',
      });
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || `Failed to ${modalMode} service line`,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/service-line-master/${code}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete service line');
      }

      await fetchServiceLines();
      setDeleteConfirmCode(null);
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Service line deleted successfully',
        variant: 'success',
      });
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to delete service line',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Create a new array with reordered items
    const newServiceLines = [...filteredServiceLines];
    const draggedItem = newServiceLines[draggedIndex];
    
    if (!draggedItem) {
      setDraggedIndex(null);
      return;
    }
    
    newServiceLines.splice(draggedIndex, 1);
    newServiceLines.splice(dropIndex, 0, draggedItem);

    // Update sortOrder for all items
    const reorderedItems = newServiceLines.map((item, index) => ({
      code: item.code,
      sortOrder: index,
    }));

    // Optimistically update UI
    setFilteredServiceLines(newServiceLines);
    setDraggedIndex(null);

    try {
      const response = await fetch('/api/admin/service-line-master/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reorderedItems }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder service lines');
      }

      // Refresh to get actual data from server
      await fetchServiceLines();
    } catch (error: any) {
      // Revert on error
      await fetchServiceLines();
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to reorder service lines',
        variant: 'error',
      });
    }
  };

  const stats = {
    total: serviceLines.length,
    active: serviceLines.filter((sl) => sl.active).length,
    inactive: serviceLines.filter((sl) => !sl.active).length,
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Database className="h-8 w-8 text-forvis-blue-600" />
            <h1 className="text-3xl font-bold text-forvis-gray-900">
              Service Line Master
            </h1>
          </div>
          <p className="text-forvis-gray-700">
            Manage master service line definitions used across the application
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{stats.total}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
              >
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4 shadow-corporate border border-green-100"
            style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
                  Active
                </p>
                <p className="text-2xl font-bold mt-2 text-green-700">{stats.active}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #10B981, #059669)' }}
              >
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4 shadow-corporate border border-red-100"
            style={{ background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
                  Inactive
                </p>
                <p className="text-2xl font-bold mt-2 text-red-700">{stats.inactive}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #EF4444, #DC2626)' }}
              >
                <XCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex-1">
                <Input
                  icon={<Search className="h-5 w-5" />}
                  placeholder="Search service lines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter by Status */}
              <Input
                variant="select"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Inactive Only' }
                ]}
              />
            </div>

            {/* Create Button */}
            <Button
              variant="gradient"
              onClick={openCreateModal}
              icon={<Plus className="h-5 w-5" />}
            >
              Create Service Line
            </Button>
          </div>
        </div>

        {/* Service Lines List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
            <p className="mt-4 text-forvis-gray-600">Loading service lines...</p>
          </div>
        ) : filteredServiceLines.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 p-12 text-center">
            <Database className="h-16 w-16 text-forvis-gray-400 mx-auto mb-4" />
            <p className="text-forvis-gray-600">
              {searchTerm || filterActive !== 'all'
                ? 'No service lines match your filters'
                : 'No service lines found'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
            <div
              className="px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
              }}
            >
              <h2 className="text-lg font-bold text-white">
                Service Lines ({filteredServiceLines.length})
              </h2>
              <p className="text-xs text-white opacity-90 mt-1">
                Drag and drop to reorder
              </p>
            </div>

            <div>
              {filteredServiceLines.map((serviceLine, index) => (
                <div
                  key={serviceLine.code}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`p-4 border-b border-forvis-gray-200 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                  } hover:bg-forvis-blue-50 transition-colors cursor-move`}
                >
                  <div className="flex items-center space-x-4">
                    <GripVertical className="h-5 w-5 text-forvis-gray-400" />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-bold text-forvis-gray-900">
                            {serviceLine.name}
                          </h3>
                          <span className="text-xs font-mono text-forvis-gray-600 bg-forvis-gray-100 px-2 py-1 rounded">
                            {serviceLine.code}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              serviceLine.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {serviceLine.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(serviceLine)}
                            className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmCode(serviceLine.code)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {serviceLine.description && (
                        <p className="text-sm text-forvis-gray-700">
                          {serviceLine.description}
                        </p>
                      )}
                      
                      <div className="mt-2 flex items-center space-x-4 text-xs text-forvis-gray-600">
                        <span>Sort Order: {serviceLine.sortOrder}</span>
                        <span>•</span>
                        <span>
                          Updated: {new Date(serviceLine.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {modalMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl">
              <div
                className="px-6 py-4 rounded-t-xl"
                style={{
                  background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
                }}
              >
                <h2 className="text-xl font-bold text-white">
                  {modalMode === 'create' ? 'Create Service Line' : 'Edit Service Line'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {modalMode === 'create' && (
                    <Input
                      label="Code"
                      required
                      maxLength={50}
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="font-mono"
                      placeholder="e.g., TAX"
                      helperText="Unique identifier (automatically converted to uppercase)"
                    />
                  )}

                  <Input
                    label="Name"
                    required
                    maxLength={200}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tax Services"
                  />

                  <Input
                    variant="textarea"
                    label="Description"
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Optional description"
                    helperText={`${formData.description.length}/500 characters`}
                  />

                  <Input
                    variant="number"
                    label="Sort Order"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    helperText="Lower numbers appear first (can also drag-and-drop to reorder)"
                  />

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 text-forvis-blue-600 focus:ring-forvis-blue-500 border-forvis-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 text-sm text-forvis-gray-700">
                      Active
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    type="submit"
                    loading={isSubmitting}
                    className="flex-1"
                  >
                    {modalMode === 'create' ? 'Create' : 'Update'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
              <div
                className="px-6 py-4 rounded-t-xl"
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                }}
              >
                <h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
              </div>

              <div className="p-6">
                <p className="text-forvis-gray-700 mb-4">
                  Are you sure you want to delete this service line?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-red-900">
                    {serviceLines.find((sl) => sl.code === deleteConfirmCode)?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-red-700 mt-1">Code: {deleteConfirmCode}</p>
                </div>
                <p className="text-sm text-forvis-gray-600">
                  This action cannot be undone. This will fail if there are external service
                  lines mapped to this master service line.
                </p>
              </div>

              <div className="px-6 py-4 border-t border-forvis-gray-200 flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmCode(null)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(deleteConfirmCode)}
                  loading={isSubmitting}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
        />
      </div>
    </div>
  );
}
