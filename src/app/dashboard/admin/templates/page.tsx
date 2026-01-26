'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Upload } from 'lucide-react';
import { TemplateList } from '@/components/features/templates/TemplateList';
import { TemplateUploadWizard } from '@/components/features/templates/wizard/TemplateUploadWizard';
import { TemplateManualWizard } from '@/components/features/templates/wizard/TemplateManualWizard';
import { ViewOnlyBadge } from '@/components/shared/ViewOnlyBadge';
import { EditActionWrapper } from '@/components/shared/EditActionWrapper';
import { usePageAccess } from '@/hooks/permissions/usePageAccess';
import { Banner } from '@/components/ui';

interface TemplateSection {
  id: number;
  sectionKey: string;
  title: string;
  content: string;
  isRequired: boolean;
  isAiAdaptable: boolean;
  order: number;
  applicableServiceLines: string | null;
  applicableProjectTypes: string | null;
  [key: string]: unknown;
}

interface TemplateResponse {
  id: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  TemplateSection?: TemplateSection[];
}

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: TemplateSection[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const { isViewOnly, canEdit } = usePageAccess();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showManualWizard, setShowManualWizard] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/templates');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to access template management.');
        } else if (response.status === 401) {
          setError('Please log in to access this page.');
        } else {
          setError(data.error || 'Failed to load templates');
        }
        return;
      }

      if (data.success) {
        // Normalize template data - map TemplateSection to sections for consistency
        const normalizedTemplates = data.data.map((template: TemplateResponse) => ({
          ...template,
          sections: template.TemplateSection || [],
        }));
        setTemplates(normalizedTemplates);
      } else {
        setError('Failed to load templates');
      }
    } catch (error) {
      setError('An error occurred while loading templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(
          templates.map((t) => (t.id === id ? data.data : t))
        );
      }
    } catch (error) {
      console.error('Error toggling template status:', error);
    }
  };

  const handleCreateNew = () => {
    setShowManualWizard(true);
  };

  const handleCopy = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}/copy`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add the new template to the list
          const normalizedTemplate = {
            ...data.data,
            sections: data.data.TemplateSection || [],
          };
          setTemplates([normalizedTemplate, ...templates]);
        }
      }
    } catch (error) {
      console.error('Error copying template:', error);
    }
  };

  const handleUploadSuccess = (templateId: number) => {
    setSuccessMessage('Template created successfully from uploaded document');
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchTemplates();
    router.push(`/dashboard/admin/templates/${templateId}`);
  };

  const handleManualSuccess = (templateId: number) => {
    setSuccessMessage('Template created successfully');
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchTemplates();
    router.push(`/dashboard/admin/templates/${templateId}`);
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold text-forvis-gray-900 flex items-center">
                  <FileText className="h-8 w-8 mr-3 text-forvis-blue-600" />
                  Template Management
                </h1>
                {isViewOnly && <ViewOnlyBadge />}
              </div>
              <p className="mt-2 text-sm font-normal text-forvis-gray-600">
                {isViewOnly 
                  ? 'Browse engagement letter templates (read-only access)'
                  : 'Create and manage engagement letter templates for your organization'}
              </p>
            </div>
            
            <EditActionWrapper>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUploadWizard(true)}
                  className="btn-primary flex items-center"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Template
                </button>
                <button onClick={handleCreateNew} className="btn-secondary flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Manual
                </button>
              </div>
            </EditActionWrapper>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6">
            <Banner
              variant="success"
              message={successMessage}
              dismissible
              onDismiss={() => setSuccessMessage('')}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-forvis-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <div className="text-red-600 mb-2 text-lg font-semibold">⚠️ Error</div>
            <p className="text-forvis-gray-600">{error}</p>
          </div>
        ) : (
          <TemplateList
            templates={templates}
            onDelete={canEdit ? handleDelete : undefined}
            onToggleActive={canEdit ? handleToggleActive : undefined}
            onCopy={canEdit ? handleCopy : undefined}
          />
        )}
      </div>

      {/* Upload Wizard Modal */}
      {showUploadWizard && (
        <TemplateUploadWizard
          isOpen={showUploadWizard}
          onClose={() => setShowUploadWizard(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Manual Wizard Modal */}
      {showManualWizard && (
        <TemplateManualWizard
          isOpen={showManualWizard}
          onClose={() => setShowManualWizard(false)}
          onSuccess={handleManualSuccess}
        />
      )}
    </div>
  );
}















