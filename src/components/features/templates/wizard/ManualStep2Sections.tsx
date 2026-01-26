'use client';

import { useState } from 'react';
import { GripVertical, Trash2, Edit2, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { ManualWizardData } from './ManualStep1Info';
import { SectionTemplateLibrary } from './SectionTemplateLibrary';
import { PlaceholderPanel } from '../editor/PlaceholderPanel';
import { SectionTemplate } from '@/lib/data/sectionTemplates';
import { ExtractedTemplateBlock } from '@/types/templateExtraction';

interface ManualStep2SectionsProps {
  wizardData: ManualWizardData;
  updateWizardData: (updates: Partial<ManualWizardData>) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function ManualStep2Sections({
  wizardData,
  updateWizardData,
  onBack,
  onComplete,
}: ManualStep2SectionsProps) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);

  const handleAddSection = (template: SectionTemplate) => {
    const newSection = {
      sectionKey: `${template.id}_${Date.now()}`,
      title: template.title,
      content: template.content,
      isRequired: template.isRequired,
      isAiAdaptable: template.isAiAdaptable,
      order: wizardData.sections.length,
    };

    updateWizardData({
      sections: [...wizardData.sections, newSection],
    });
  };

  const handleAddBlank = () => {
    const newSection = {
      sectionKey: `section_${Date.now()}`,
      title: 'New Section',
      content: 'Enter your content here...\n\nYou can use placeholders like {{clientName}}, {{taskType}}, {{currentDate}}, etc.',
      isRequired: true,
      isAiAdaptable: false,
      order: wizardData.sections.length,
    };

    updateWizardData({
      sections: [...wizardData.sections, newSection],
    });

    setEditingSection(wizardData.sections.length);
  };

  const handleRemoveSection = (index: number) => {
    const newSections = wizardData.sections.filter((_, i) => i !== index);
    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i;
    });
    updateWizardData({ sections: newSections });

    if (selectedSectionIndex === index) {
      setSelectedSectionIndex(null);
    }
  };

  const handleEditSection = (index: number, field: string, value: any) => {
    const newSections = [...wizardData.sections];
    newSections[index] = { ...newSections[index], [field]: value } as ExtractedTemplateBlock;
    updateWizardData({ sections: newSections });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...wizardData.sections];
    const draggedItem = newSections[draggedIndex];
    
    if (!draggedItem) return;
    
    newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);

    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i;
    });

    updateWizardData({ sections: newSections });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleComplete = () => {
    if (wizardData.sections.length === 0) {
      alert('Please add at least one section before creating the template.');
      return;
    }
    onComplete();
  };

  // Convert sections for placeholder panel
  const extractedBlocks: ExtractedTemplateBlock[] = wizardData.sections.map((section) => ({
    sectionKey: section.sectionKey,
    title: section.title,
    content: section.content,
    isRequired: section.isRequired,
    isAiAdaptable: section.isAiAdaptable,
    order: section.order,
    suggestedPlaceholders: [],
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Build Your Template
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Add sections from the library or create custom sections. Drag to reorder.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6" style={{ minHeight: '500px' }}>
        {/* Left Panel: Section Library (40%) */}
        <div className="w-2/5 border border-forvis-gray-200 rounded-lg p-4 bg-white overflow-hidden flex flex-col">
          <SectionTemplateLibrary
            onAddSection={handleAddSection}
            onAddBlank={handleAddBlank}
          />
        </div>

        {/* Right Panel: Selected Sections (60%) */}
        <div className="w-3/5 border border-forvis-gray-200 rounded-lg p-4 bg-white overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-forvis-gray-900">
              Selected Sections ({wizardData.sections.length})
            </h4>
          </div>

          {wizardData.sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-forvis-gray-400 mb-3" />
              <p className="text-sm text-forvis-gray-600 mb-2">
                No sections added yet
              </p>
              <p className="text-xs text-forvis-gray-500">
                Add sections from the library on the left
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {wizardData.sections.map((section, index) => (
                <div
                  key={section.sectionKey}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group border-2 rounded-lg p-3 cursor-move transition-all ${
                    draggedIndex === index
                      ? 'opacity-50 border-forvis-blue-400'
                      : 'border-forvis-gray-200 hover:border-forvis-blue-300'
                  } ${editingSection === index ? 'border-forvis-blue-500 bg-forvis-blue-50' : 'bg-white'}`}
                >
                  {editingSection === index ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-forvis-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) =>
                            handleEditSection(index, 'title', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-forvis-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-forvis-gray-700 mb-1">
                          Content
                        </label>
                        <textarea
                          value={section.content}
                          onChange={(e) =>
                            handleEditSection(index, 'content', e.target.value)
                          }
                          rows={6}
                          className="w-full px-2 py-1 text-sm border border-forvis-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 resize-none font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={section.isRequired}
                            onChange={(e) =>
                              handleEditSection(index, 'isRequired', e.target.checked)
                            }
                            className="w-3 h-3 text-forvis-blue-600 border-forvis-gray-300 rounded"
                          />
                          <span className="text-xs text-forvis-gray-700">Required</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={section.isAiAdaptable}
                            onChange={(e) =>
                              handleEditSection(index, 'isAiAdaptable', e.target.checked)
                            }
                            className="w-3 h-3 text-forvis-blue-600 border-forvis-gray-300 rounded"
                          />
                          <span className="text-xs text-forvis-gray-700">AI Adaptable</span>
                        </label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setEditingSection(null)}
                          variant="secondary"
                          size="sm"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-5 h-5 text-forvis-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-forvis-gray-900">
                            {section.title}
                          </p>
                          {section.isRequired && (
                            <span className="text-xs text-forvis-gray-500">• Required</span>
                          )}
                          {section.isAiAdaptable && (
                            <span className="text-xs text-purple-600">• AI</span>
                          )}
                        </div>
                        <p className="text-xs text-forvis-gray-600 line-clamp-2">
                          {section.content.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingSection(index)}
                          className="p-1 rounded hover:bg-forvis-blue-100 transition-colors"
                          title="Edit section"
                        >
                          <Edit2 className="w-4 h-4 text-forvis-blue-600" />
                        </button>
                        <button
                          onClick={() => handleRemoveSection(index)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove section"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel: Placeholder Validator */}
      {wizardData.sections.length > 0 && (
        <PlaceholderPanel sections={extractedBlocks} />
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-forvis-gray-200">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button
          onClick={handleComplete}
          disabled={wizardData.sections.length === 0}
          style={{
            background:
              wizardData.sections.length === 0
                ? undefined
                : 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
          className={
            wizardData.sections.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }
        >
          Create Template
        </Button>
      </div>
    </div>
  );
}
