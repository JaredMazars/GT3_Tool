'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';
import { TemplateList } from '@/components/features/templates/TemplateList';

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  projectType: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  sections: any[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setTemplates(data.data);
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
    router.push('/dashboard/admin/templates/new');
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-forvis-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-forvis-blue-600" />
                Template Management
              </h1>
              <p className="mt-2 text-sm text-forvis-gray-700">
                Create and manage engagement letter templates for your organization
              </p>
            </div>
            
            <button onClick={handleCreateNew} className="btn-primary flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Template
            </button>
          </div>
        </div>

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
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>
    </div>
  );
}






