'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GripVertical } from 'lucide-react';
import { ExtractedTemplateBlock } from '@/types/templateExtraction';
import { PlaceholderHighlighter } from './PlaceholderHighlighter';

interface SectionEditorProps {
  section: ExtractedTemplateBlock;
  onUpdate: (updates: Partial<ExtractedTemplateBlock>) => void;
}

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [editorHeight, setEditorHeight] = useState(50); // percentage

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('split-editor-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newHeight = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain between 20% and 80%
    if (newHeight >= 20 && newHeight <= 80) {
      setEditorHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove mouse event listeners
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Section Title
        </label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
          placeholder="Enter section title..."
        />
      </div>

      {/* Split View Editor */}
      <div>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Section Content
        </label>
        <div
          id="split-editor-container"
          className="border border-forvis-gray-300 rounded-lg overflow-hidden"
          style={{ height: '500px' }}
        >
          {/* Markdown Editor (Top) */}
          <div style={{ height: `${editorHeight}%` }}>
            <PlaceholderHighlighter
              content={section.content}
              onChange={(newContent) => onUpdate({ content: newContent })}
              suggestedPlaceholders={section.suggestedPlaceholders || []}
            />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`h-2 bg-forvis-gray-200 hover:bg-forvis-blue-300 cursor-row-resize flex items-center justify-center transition-colors ${
              isDragging ? 'bg-forvis-blue-400' : ''
            }`}
          >
            <GripVertical className="w-4 h-4 text-forvis-gray-500 rotate-90" />
          </div>

          {/* Preview (Bottom) */}
          <div
            style={{ height: `${100 - editorHeight}%` }}
            className="p-4 bg-white overflow-y-auto prose prose-sm max-w-none"
          >
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Section Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`required-${section.sectionKey}`}
            checked={section.isRequired}
            onChange={(e) => onUpdate({ isRequired: e.target.checked })}
            className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
          />
          <label
            htmlFor={`required-${section.sectionKey}`}
            className="text-sm font-medium text-forvis-gray-700"
          >
            Required section
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`adaptable-${section.sectionKey}`}
            checked={section.isAiAdaptable}
            onChange={(e) => onUpdate({ isAiAdaptable: e.target.checked })}
            className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
          />
          <label
            htmlFor={`adaptable-${section.sectionKey}`}
            className="text-sm font-medium text-forvis-gray-700"
          >
            AI adaptable
          </label>
        </div>
      </div>

      {/* Applicability Rules */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Applicable Service Lines
          </label>
          <select
            multiple
            value={section.applicableServiceLines || []}
            onChange={(e) => {
              const selected = Array.from(
                e.target.selectedOptions,
                (option) => option.value
              );
              onUpdate({ applicableServiceLines: selected });
            }}
            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            size={4}
          >
            <option value="TAX">Tax</option>
            <option value="AUDIT">Audit</option>
            <option value="ACCOUNTING">Accounting</option>
            <option value="ADVISORY">Advisory</option>
          </select>
          <p className="mt-1 text-xs text-forvis-gray-500">
            Hold Ctrl/Cmd to select multiple. Leave empty for all service lines.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Applicable Project Types
          </label>
          <input
            type="text"
            value={section.applicableProjectTypes?.join(', ') || ''}
            onChange={(e) => {
              const types = e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
              onUpdate({ applicableProjectTypes: types });
            }}
            className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            placeholder="e.g., TAX_RETURN, AUDIT_OPINION"
          />
          <p className="mt-1 text-xs text-forvis-gray-500">
            Comma-separated list. Leave empty for all project types.
          </p>
        </div>
      </div>
    </div>
  );
}
