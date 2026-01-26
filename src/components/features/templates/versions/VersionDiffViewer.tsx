'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { diffWords } from 'diff';

interface VersionDiffViewerProps {
  templateId: number;
  versionId: number;
  onClose: () => void;
}

interface VersionData {
  id: number;
  version: number;
  name: string;
  TemplateSectionVersion: Array<{
    sectionKey: string;
    title: string;
    content: string;
    order: number;
  }>;
}

export function VersionDiffViewer({
  templateId,
  versionId,
  onClose,
}: VersionDiffViewerProps) {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [templateId, versionId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch version data
      const versionResponse = await fetch(
        `/api/admin/templates/${templateId}/versions/${versionId}`
      );
      if (!versionResponse.ok) throw new Error('Failed to fetch version');
      const versionResult = await versionResponse.json();

      // Fetch current template data
      const templateResponse = await fetch(
        `/api/admin/templates/${templateId}`
      );
      if (!templateResponse.ok) throw new Error('Failed to fetch template');
      const templateResult = await templateResponse.json();

      setVersionData(versionResult.data);
      setCurrentTemplate(templateResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-forvis-gray-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (error || !versionData || !currentTemplate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-sm text-red-700">{error || 'Failed to load data'}</p>
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const versionSections = versionData.TemplateSectionVersion.sort(
    (a, b) => a.order - b.order
  );
  const currentSections = (currentTemplate.TemplateSection || []).sort(
    (a: any, b: any) => a.order - b.order
  );

  const selectedVersionSection = versionSections[selectedSectionIndex];
  const selectedCurrentSection = currentSections.find(
    (s: any) => s.sectionKey === selectedVersionSection?.sectionKey
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-forvis-gray-200 flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
        >
          <h2 className="text-xl font-semibold text-white">
            Compare Versions: v{versionData.version} vs Current
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-forvis-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Section Navigator */}
          <div className="w-64 border-r border-forvis-gray-200 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-forvis-gray-900 mb-2">
              Sections
            </h3>
            <div className="space-y-1">
              {versionSections.map((section, index) => (
                <button
                  key={section.sectionKey}
                  onClick={() => setSelectedSectionIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSectionIndex === index
                      ? 'bg-forvis-blue-100 text-forvis-blue-900 font-medium'
                      : 'hover:bg-forvis-gray-100 text-forvis-gray-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          {/* Diff View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Version Column */}
            <div className="flex-1 flex flex-col border-r border-forvis-gray-200">
              <div className="px-4 py-3 bg-forvis-blue-50 border-b border-forvis-blue-200">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-forvis-blue-600" />
                  <h4 className="text-sm font-semibold text-forvis-blue-900">
                    Version {versionData.version}
                  </h4>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedVersionSection && (
                  <DiffContent
                    content={selectedVersionSection.content}
                    compareContent={selectedCurrentSection?.content || ''}
                    isLeft={true}
                  />
                )}
              </div>
            </div>

            {/* Current Column */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-green-900">
                    Current Template
                  </h4>
                  <ArrowRight className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedCurrentSection && selectedVersionSection ? (
                  <DiffContent
                    content={selectedCurrentSection.content}
                    compareContent={selectedVersionSection.content}
                    isLeft={false}
                  />
                ) : (
                  <div className="text-center py-8 text-sm text-forvis-gray-500">
                    Section not found in current template
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

interface DiffContentProps {
  content: string;
  compareContent: string;
  isLeft: boolean;
}

function DiffContent({ content, compareContent, isLeft }: DiffContentProps) {
  const diff = diffWords(isLeft ? content : compareContent, isLeft ? compareContent : content);

  return (
    <div className="prose prose-sm max-w-none">
      {diff.map((part, index) => {
        if (part.added && !isLeft) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-900 px-1 rounded"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed && isLeft) {
          return (
            <span key={index} className="bg-red-100 text-red-900 px-1 rounded line-through">
              {part.value}
            </span>
          );
        }
        if (!part.added && !part.removed) {
          return <span key={index}>{part.value}</span>;
        }
        return null;
      })}
    </div>
  );
}
