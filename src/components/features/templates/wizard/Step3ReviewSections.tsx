'use client';

import { useState } from 'react';
import { GripVertical, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { WizardData } from './TemplateUploadWizard';
import { SectionEditor } from '../editor/SectionEditor';
import { PlaceholderPanel } from '../editor/PlaceholderPanel';
import { ExtractedTemplateBlock } from '@/types/templateExtraction';

interface Step3ReviewSectionsProps {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3ReviewSections({
  wizardData,
  updateWizardData,
  onNext,
  onBack,
}: Step3ReviewSectionsProps) {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Ensure sections is always an array
  const sections = wizardData.sections || [];

  const handleSectionUpdate = (
    index: number,
    updates: Partial<ExtractedTemplateBlock>
  ) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates } as ExtractedTemplateBlock;
    updateWizardData({ sections: newSections });
  };

  const handleDeleteSection = (index: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this section? This cannot be undone.'
      )
    ) {
      return;
    }

    const newSections = sections.filter((_, i) => i !== index);
    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i;
    });
    updateWizardData({ sections: newSections });

    // Adjust selected index if needed
    if (selectedSectionIndex >= newSections.length) {
      setSelectedSectionIndex(Math.max(0, newSections.length - 1));
    }
  };

  const handleAddSection = () => {
    const newSection: ExtractedTemplateBlock = {
      sectionKey: `section_${Date.now()}`,
      title: 'New Section',
      content: 'Enter your content here...',
      isRequired: true,
      isAiAdaptable: false,
      order: sections.length,
      suggestedPlaceholders: [],
    };

    const newSections = [...sections, newSection];
    updateWizardData({ sections: newSections });
    setSelectedSectionIndex(newSections.length - 1);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
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
    setSelectedSectionIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handlePlaceholderClick = (sectionIndex: number) => {
    setSelectedSectionIndex(sectionIndex);
  };

  const handleNext = () => {
    if (sections.length === 0) {
      alert('Please add at least one section before continuing.');
      return;
    }
    onNext();
  };

  const selectedSection = sections[selectedSectionIndex];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
          Review & Edit Sections
        </h3>
        <p className="text-sm text-forvis-gray-600">
          Review the AI-extracted sections, edit content, and configure
          applicability rules.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6" style={{ minHeight: '600px' }}>
        {/* Left Panel: Section List (40%) */}
        <div className="w-2/5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-forvis-gray-900">
              Sections ({sections.length})
            </h4>
            <Button onClick={handleAddSection} variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {sections.map((section, index) => (
              <div
                key={section.sectionKey}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedSectionIndex(index)}
                className={`group flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSectionIndex === index
                    ? 'border-forvis-blue-500 bg-forvis-blue-50'
                    : 'border-forvis-gray-200 hover:border-forvis-blue-300 bg-white hover:bg-forvis-gray-50'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-5 h-5 text-forvis-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-forvis-gray-900 truncate">
                      {section.title}
                    </p>
                    {section.suggestedPlaceholders &&
                      section.suggestedPlaceholders.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                          {section.suggestedPlaceholders.length}
                        </span>
                      )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-forvis-gray-600">
                      {section.content.split(/\s+/).length} words
                    </p>
                    {section.isRequired && (
                      <span className="text-xs text-forvis-gray-500">
                        • Required
                      </span>
                    )}
                    {section.isAiAdaptable && (
                      <span className="text-xs text-forvis-gray-500">
                        • AI
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSection(index);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                  title="Delete section"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-forvis-gray-400 mb-3" />
                <p className="text-sm text-forvis-gray-600 mb-2">
                  No sections yet
                </p>
                <Button onClick={handleAddSection} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Section
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Section Editor (60%) */}
        <div className="w-3/5">
          {selectedSection ? (
            <SectionEditor
              section={selectedSection}
              onUpdate={(updates) =>
                handleSectionUpdate(selectedSectionIndex, updates)
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-forvis-gray-300 rounded-lg">
              <p className="text-sm text-forvis-gray-500">
                Select a section to edit
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel: Placeholder Validator */}
      <PlaceholderPanel
        sections={sections}
        onPlaceholderClick={handlePlaceholderClick}
      />

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-forvis-gray-200">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button
          onClick={handleNext}
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
        >
          Continue to Finalize
        </Button>
      </div>
    </div>
  );
}
