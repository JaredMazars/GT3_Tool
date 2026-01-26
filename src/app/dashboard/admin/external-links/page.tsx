'use client';

import { useState, useEffect } from 'react';
import { 
  LinkIcon,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '@/components/ui';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { AlertModal } from '@/components/shared/AlertModal';
import { IconSelector, getIconComponent } from '@/components/features/admin/IconSelector';
import { ExternalLink } from '@/types/dto';

interface LinkFormData {
  name: string;
  url: string;
  icon: string;
  active: boolean;
}

export default function ExternalLinksPage() {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    name: '',
    url: '',
    icon: 'LinkIcon',
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/external-links');
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to manage external links.');
        } else if (response.status === 401) {
          setError('Please log in to access this page.');
        } else {
          setError(data.error || 'Failed to load external links');
        }
        return;
      }
      
      if (data.success) {
        setLinks(data.data);
      } else {
        setError('Failed to load external links');
      }
    } catch (error) {
      setError('An error occurred while loading external links. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (link?: ExternalLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        name: link.name,
        url: link.url,
        icon: link.icon,
        active: link.active,
      });
    } else {
      setEditingLink(null);
      setFormData({
        name: '',
        url: '',
        icon: 'LinkIcon',
        active: true,
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLink(null);
    setFormData({
      name: '',
      url: '',
      icon: 'LinkIcon',
      active: true,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be 100 characters or less';
    }

    if (!formData.url.trim()) {
      errors.url = 'URL is required';
    } else if (formData.url.length > 500) {
      errors.url = 'URL must be 500 characters or less';
    } else {
      try {
        new URL(formData.url);
      } catch {
        errors.url = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    if (!formData.icon) {
      errors.icon = 'Please select an icon';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const url = editingLink
        ? `/api/admin/external-links/${editingLink.id}`
        : '/api/admin/external-links';
      
      const method = editingLink ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save link');
      }

      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: editingLink
          ? 'External link updated successfully'
          : 'External link created successfully',
        variant: 'success',
      });

      handleCloseModal();
      fetchLinks();
      
      // Trigger navigation refresh
      window.dispatchEvent(new Event('refreshExternalLinks'));
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (link: ExternalLink) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete External Link',
      message: `Are you sure you want to delete "${link.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/external-links/${link.id}`, {
            method: 'DELETE',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete link');
          }

          setAlertModal({
            isOpen: true,
            title: 'Success',
            message: 'External link deleted successfully',
            variant: 'success',
          });

          fetchLinks();
          
          // Trigger navigation refresh
          window.dispatchEvent(new Event('refreshExternalLinks'));
        } catch (error) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: error instanceof Error ? error.message : 'Failed to delete link',
            variant: 'error',
          });
        } finally {
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      },
    });
  };

  const handleToggleActive = async (link: ExternalLink) => {
    try {
      const response = await fetch(`/api/admin/external-links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !link.active }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update link status');
      }

      fetchLinks();
      
      // Trigger navigation refresh
      window.dispatchEvent(new Event('refreshExternalLinks'));
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update link status',
        variant: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
          <p className="mt-2 text-sm text-forvis-gray-600">Loading external links...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            <LinkIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-forvis-gray-900">External Links Management</h1>
            <p className="text-sm text-forvis-gray-600 mt-1">Manage links to external software and resources</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-5 w-5 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Links Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-forvis-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  Icon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forvis-gray-200">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-forvis-gray-500">
                    No external links configured. Click "Add Link" to create one.
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const IconComponent = getIconComponent(link.icon);
                  return (
                    <tr key={link.id} className="hover:bg-forvis-gray-50">
                      <td className="px-6 py-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-forvis-gray-900">{link.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 hover:underline"
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(link)}
                          className="focus:outline-none"
                        >
                          <Badge color={link.active ? 'green' : 'gray'}>
                            {link.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(link)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-forvis-blue-700 hover:bg-forvis-blue-50 rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(link)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-forvis-gray-200">
              <h2 className="text-xl font-semibold text-forvis-gray-900">
                {editingLink ? 'Edit External Link' : 'Add External Link'}
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g., SharePoint, Office 365"
              />

              <Input
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                error={formErrors.url}
                placeholder="https://example.com"
              />

              <IconSelector
                label="Icon"
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                error={formErrors.icon}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-forvis-blue-600 focus:ring-forvis-blue-500 border-forvis-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-forvis-gray-700">
                  Active (show in navigation)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : editingLink ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </div>
  );
}
