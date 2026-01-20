'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { TemplateSectionManager } from '@/components/features/templates/TemplateSectionManager';
import { VersionsTab } from '@/components/features/templates/versions/VersionsTab';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  active: boolean;
  currentVersion?: number;
  sections?: TemplateSection[];
  TemplateSection?: TemplateSection[];
}

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
}

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'versions'>('sections');
  
  const [template, setTemplate] = useState<Template>({
    id: 0,
    name: '',
    description: '',
    type: 'ENGAGEMENT_LETTER',
    serviceLine: null,
    active: true,
    sections: [],
  });

  useEffect(() => {
    fetchTemplate();
  }, [params.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/templates/${params.id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        // Normalize template data - map TemplateSection to sections for consistency
        const normalizedTemplate = {
          ...data.data,
          sections: data.data.TemplateSection || data.data.sections || [],
        };
        setTemplate(normalizedTemplate);
      } else {
        setError('Failed to load template');
      }
    } catch (error) {
      setError('An error occurred while loading the template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/templates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description || undefined,
          type: template.type,
          serviceLine: template.serviceLine || undefined,
          active: template.active,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Normalize template data
        const normalizedTemplate = {
          ...data.data,
          sections: data.data.TemplateSection || data.data.sections || [],
        };
        setTemplate(normalizedTemplate);
      } else {
        setError(data.error || 'Failed to save template');
      }
    } catch (error) {
      setError('An error occurred while saving the template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async (section: Omit<TemplateSection, 'id'>) => {
    try {
      const response = await fetch(`/api/admin/templates/${params.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section),
      });

      if (response.ok) {
        fetchTemplate();
      }
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  const handleUpdateSection = async (id: number, updates: Partial<TemplateSection>) => {
    try {
      const response = await fetch(
        `/api/admin/templates/${params.id}/sections/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        fetchTemplate();
      }
    } catch (error) {
      console.error('Error updating section:', error);
    }
  };

  const handleDeleteSection = async (id: number) => {
    try {
      const response = await fetch(
        `/api/admin/templates/${params.id}/sections/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        fetchTemplate();
      }
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const handleReorder = async (sections: TemplateSection[]) => {
    // Update all sections with new order
    try {
      await Promise.all(
        sections.map((section) =>
          fetch(`/api/admin/templates/${params.id}/sections/${section.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: section.order }),
          })
        )
      );
      fetchTemplate();
    } catch (error) {
      console.error('Error reordering sections:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-forvis-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-forvis-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/admin/templates')}
            className="text-sm text-forvis-blue-600 hover:text-forvis-blue-700 flex items-center mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-forvis-gray-900">
                Edit Template
              </h1>
              {template.currentVersion && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                >
                  v{template.currentVersion}
                </span>
              )}
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving || !template.name}
              className="btn-primary flex items-center"
            >
              <Check className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-forvis-gray-200">
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === 'sections'
                  ? 'text-forvis-blue-600'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900'
              }`}
            >
              Sections
              {activeTab === 'sections' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === 'versions'
                  ? 'text-forvis-blue-600'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900'
              }`}
            >
              Versions
              {activeTab === 'versions' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Template Form */}
        {activeTab === 'sections' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
              <h2 className="text-lg font-semibold text-forvis-gray-900 mb-4">
                Template Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    placeholder="e.g., Standard Engagement Letter"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={template.description || ''}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    rows={3}
                    placeholder="Optional description of this template"
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={template.type}
                      onChange={(e) => setTemplate({ ...template, type: e.target.value })}
                      className="input-field"
                    >
                      <option value="ENGAGEMENT_LETTER">Engagement Letter</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="AGREEMENT">Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                      Active
                    </label>
                    <select
                      value={template.active ? 'true' : 'false'}
                      onChange={(e) => setTemplate({ ...template, active: e.target.value === 'true' })}
                      className="input-field"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                      Service Line (Optional)
                    </label>
                    <select
                      value={template.serviceLine || ''}
                      onChange={(e) => setTemplate({ ...template, serviceLine: e.target.value || null })}
                      className="input-field"
                    >
                      <option value="">All Service Lines</option>
                      <option value="TAX">Tax</option>
                      <option value="AUDIT">Audit</option>
                      <option value="ACCOUNTING">Accounting</option>
                      <option value="ADVISORY">Advisory</option>
                    </select>
                  </div>

                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="card p-6">
              <TemplateSectionManager
                sections={template.sections || []}
                onAddSection={handleAddSection}
                onUpdateSection={handleUpdateSection}
                onDeleteSection={handleDeleteSection}
                onReorder={handleReorder}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-md font-semibold text-forvis-gray-900 mb-4">
                Available Placeholders
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{clientName}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{clientCode}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{taskName}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{serviceLine}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{taxYear}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{currentDate}}'}
                </div>
                <div className="p-2 bg-forvis-gray-50 rounded">
                  {'{{partnerName}}'}
                </div>
              </div>
              <p className="text-xs text-forvis-gray-600 mt-4">
                Use these placeholders in your template sections. They will be replaced with actual values when generating documents.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-md font-semibold text-forvis-gray-900 mb-4">
                Tips
              </h3>
              <ul className="text-xs text-forvis-gray-600 space-y-2 list-disc list-inside">
                <li>Use markdown for formatting</li>
                <li>Mark sections as "AI Adaptable" to customize for each project</li>
                <li>Required sections always appear in generated documents</li>
                <li>Set service line/project type for targeted templates</li>
              </ul>
            </div>
          </div>
        </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="card p-6">
            <VersionsTab templateId={template.id} />
          </div>
        )}
      </div>
    </div>
  );
}

