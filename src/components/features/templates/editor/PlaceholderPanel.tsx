'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import {
  ExtractedTemplateBlock,
  extractPlaceholdersFromContent,
  isStandardPlaceholder,
} from '@/types/templateExtraction';

interface PlaceholderPanelProps {
  sections: ExtractedTemplateBlock[];
  onPlaceholderClick?: (sectionIndex: number, placeholder: string) => void;
}

interface PlaceholderInfo {
  name: string;
  type: 'standard' | 'custom' | 'malformed';
  sectionIndices: number[];
  count: number;
}

export function PlaceholderPanel({
  sections,
  onPlaceholderClick,
}: PlaceholderPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Aggregate all placeholders across sections
  const placeholderMap = new Map<string, PlaceholderInfo>();

  sections.forEach((section, index) => {
    const placeholders = extractPlaceholdersFromContent(section.content);

    placeholders.forEach((placeholder) => {
      if (!placeholderMap.has(placeholder)) {
        const isStandard = isStandardPlaceholder(placeholder);
        const isMalformed = !placeholder.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

        placeholderMap.set(placeholder, {
          name: placeholder,
          type: isMalformed ? 'malformed' : isStandard ? 'standard' : 'custom',
          sectionIndices: [index],
          count: 1,
        });
      } else {
        const info = placeholderMap.get(placeholder)!;
        if (!info.sectionIndices.includes(index)) {
          info.sectionIndices.push(index);
        }
        info.count++;
      }
    });
  });

  const placeholders = Array.from(placeholderMap.values()).sort((a, b) => {
    // Sort by type first (standard, custom, malformed), then by name
    const typeOrder = { standard: 0, custom: 1, malformed: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.name.localeCompare(b.name);
  });

  const standardCount = placeholders.filter((p) => p.type === 'standard').length;
  const customCount = placeholders.filter((p) => p.type === 'custom').length;
  const malformedCount = placeholders.filter((p) => p.type === 'malformed').length;

  if (placeholders.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-forvis-gray-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-forvis-gray-900">
            Placeholder Validation
          </h4>
          <div className="flex items-center gap-2">
            {standardCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3" />
                {standardCount}
              </span>
            )}
            {customCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="w-3 h-3" />
                {customCount}
              </span>
            )}
            {malformedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <XCircle className="w-3 h-3" />
                {malformedCount}
              </span>
            )}
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-forvis-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-forvis-gray-500" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-forvis-gray-600 pb-2 border-b border-forvis-gray-200">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-600" />
              <span>Custom (needs mapping)</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-600" />
              <span>Malformed</span>
            </div>
          </div>

          {/* Placeholder List */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {placeholders.map((placeholder) => (
              <button
                key={placeholder.name}
                onClick={() => {
                  if (onPlaceholderClick && placeholder.sectionIndices[0] !== undefined) {
                    onPlaceholderClick(
                      placeholder.sectionIndices[0],
                      placeholder.name
                    );
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                  placeholder.type === 'standard'
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : placeholder.type === 'custom'
                    ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    : 'border-red-200 bg-red-50 hover:bg-red-100'
                }`}
              >
                {placeholder.type === 'standard' && (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
                {placeholder.type === 'custom' && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                )}
                {placeholder.type === 'malformed' && (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-forvis-gray-900 truncate">
                    {`{{${placeholder.name}}}`}
                  </p>
                  <p className="text-xs text-forvis-gray-600">
                    {placeholder.count} use{placeholder.count > 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Warnings for custom/malformed */}
          {(customCount > 0 || malformedCount > 0) && (
            <div className="pt-2 border-t border-forvis-gray-200 space-y-2">
              {customCount > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium">
                      {customCount} custom placeholder{customCount > 1 ? 's' : ''} detected
                    </p>
                    <p className="mt-1 text-yellow-700">
                      These will need data mapping before template generation works correctly.
                    </p>
                  </div>
                </div>
              )}
              {malformedCount > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-medium">
                      {malformedCount} malformed placeholder{malformedCount > 1 ? 's' : ''} found
                    </p>
                    <p className="mt-1 text-red-700">
                      Fix syntax errors (must match pattern: {`{{variableName}}`}).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
