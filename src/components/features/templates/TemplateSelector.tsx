'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface TemplateSection {
  id: number;
  [key: string]: unknown;
}

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  sections?: TemplateSection[];
  TemplateSection?: TemplateSection[];
}

interface TemplateSelectorProps {
  serviceLine: string;
  selectedTemplateId: number | null;
  onSelect: (templateId: number | null) => void;
}

export function TemplateSelector({
  serviceLine,
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [serviceLine]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'ENGAGEMENT_LETTER',
        serviceLine,
      });

      const response = await fetch(`/api/templates/available?${params}`);
      const data = await response.json();

      if (data.success) {
        // Normalize template data - map TemplateSection to sections for consistency
        const normalizedTemplates = data.data.map((template: Template) => ({
          ...template,
          sections: template.TemplateSection || template.sections || [],
        }));
        setTemplates(normalizedTemplates);
        
        // Auto-select first template if none selected
        if (!selectedTemplateId && normalizedTemplates.length > 0) {
          onSelect(normalizedTemplates[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-forvis-gray-600">
        Loading available templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-forvis-gray-300 p-6 text-center">
        <FileText className="h-12 w-12 mx-auto text-forvis-gray-400 mb-3" />
        <p className="text-sm text-forvis-gray-600">
          No engagement letter templates available for this service line.
        </p>
        <p className="text-xs text-forvis-gray-500 mt-2">
          Contact an administrator to create a template.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-forvis-gray-700">
        Select Template
      </label>
      
      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              selectedTemplateId === template.id
                ? 'border-forvis-blue-500 bg-forvis-blue-50'
                : 'border-forvis-gray-200 hover:border-forvis-blue-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-md font-semibold text-forvis-gray-900 mb-1">
                  {template.name}
                </h4>
                {template.description && (
                  <p className="text-sm text-forvis-gray-600 mb-2">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-forvis-gray-500">
                  <span>{(template.sections || template.TemplateSection || []).length} sections</span>
                  {template.serviceLine && <span>• {template.serviceLine}</span>}
                </div>
              </div>
              
              {selectedTemplateId === template.id && (
                <div className="ml-4">
                  <div className="w-6 h-6 bg-forvis-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
