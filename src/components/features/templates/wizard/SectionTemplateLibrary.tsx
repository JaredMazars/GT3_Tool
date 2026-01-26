'use client';

import { useState } from 'react';
import { Plus, Eye, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  SectionTemplate,
  SECTION_TEMPLATES,
  SECTION_CATEGORIES,
  getSectionTemplatesByCategory,
} from '@/lib/data/sectionTemplates';
import { extractPlaceholdersFromContent } from '@/types/templateExtraction';

interface SectionTemplateLibraryProps {
  onAddSection: (template: SectionTemplate) => void;
  onAddBlank: () => void;
  selectedCategory?: string;
}

export function SectionTemplateLibrary({
  onAddSection,
  onAddBlank,
  selectedCategory,
}: SectionTemplateLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    selectedCategory || 'opening'
  );
  const [previewTemplate, setPreviewTemplate] = useState<SectionTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = searchTerm
    ? SECTION_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : getSectionTemplatesByCategory(
        activeCategory as SectionTemplate['category']
      );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-forvis-gray-900">
            Section Library
          </h3>
          <Button onClick={onAddBlank} size="sm" variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            Blank Section
          </Button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search sections..."
          className="w-full px-3 py-2 text-sm border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category Tabs */}
      {!searchTerm && (
        <div className="flex gap-1 mb-4 border-b border-forvis-gray-200">
          {SECTION_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                activeCategory === category.id
                  ? 'text-forvis-blue-600'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900'
              }`}
              title={category.description}
            >
              {category.label}
              {activeCategory === category.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Template Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredTemplates.map((template) => (
          <SectionTemplateCard
            key={template.id}
            template={template}
            onAdd={() => onAddSection(template)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-forvis-gray-400 mx-auto mb-2" />
            <p className="text-sm text-forvis-gray-600">
              {searchTerm ? 'No sections found' : 'No sections in this category'}
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onAdd={() => {
            onAddSection(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}

interface SectionTemplateCardProps {
  template: SectionTemplate;
  onAdd: () => void;
  onPreview: () => void;
}

function SectionTemplateCard({
  template,
  onAdd,
  onPreview,
}: SectionTemplateCardProps) {
  const placeholders = extractPlaceholdersFromContent(template.content);
  const hasRecommendedTag = template.tags?.includes('recommended');
  const hasPopularTag = template.tags?.includes('popular');

  return (
    <div className="group border border-forvis-gray-200 rounded-lg p-3 hover:border-forvis-blue-300 hover:bg-forvis-blue-50 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
          }}
        >
          <FileText className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-forvis-gray-900 truncate">
              {template.title}
            </h4>
            {(hasRecommendedTag || hasPopularTag) && (
              <div className="flex items-center gap-1">
                {hasRecommendedTag && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <Sparkles className="w-3 h-3" />
                  </span>
                )}
                {hasPopularTag && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Popular
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-forvis-gray-600 mb-2 line-clamp-2">
            {template.description}
          </p>

          <div className="flex items-center gap-2">
            {placeholders.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                {placeholders.length} placeholder{placeholders.length > 1 ? 's' : ''}
              </span>
            )}
            {template.isAiAdaptable && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                AI
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPreview}
            className="p-1 rounded hover:bg-forvis-blue-100 transition-colors"
            title="Preview content"
          >
            <Eye className="w-4 h-4 text-forvis-blue-600" />
          </button>
          <button
            onClick={onAdd}
            className="p-1 rounded hover:bg-green-100 transition-colors"
            title="Add to template"
          >
            <Plus className="w-4 h-4 text-green-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface PreviewModalProps {
  template: SectionTemplate;
  onClose: () => void;
  onAdd: () => void;
}

function PreviewModal({ template, onClose, onAdd }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-forvis-gray-200"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
        >
          <h3 className="text-lg font-semibold text-white">{template.title}</h3>
          <p className="text-sm text-forvis-blue-100 mt-1">
            {template.description}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-forvis-gray-800 font-sans">
              {template.content}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
          <Button
            onClick={onAdd}
            style={{
              background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add to Template
          </Button>
        </div>
      </div>
    </div>
  );
}
