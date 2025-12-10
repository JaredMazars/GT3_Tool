'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  ArrowUpIcon,
  ArrowDownIcon,
  Check,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

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

interface TemplateSectionManagerProps {
  sections: TemplateSection[];
  onAddSection: (section: Omit<TemplateSection, 'id'>) => void;
  onUpdateSection: (id: number, section: Partial<TemplateSection>) => void;
  onDeleteSection: (id: number) => void;
  onReorder: (sections: TemplateSection[]) => void;
}

export function TemplateSectionManager({
  sections = [],
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onReorder,
}: TemplateSectionManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<TemplateSection>>({
    sectionKey: '',
    title: '',
    content: '',
    isRequired: true,
    isAiAdaptable: false,
    order: sections.length + 1,
    applicableServiceLines: null,
    applicableProjectTypes: null,
  });

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sortedSections];
    const current = newSections[index];
    const previous = newSections[index - 1];
    if (!current || !previous) return;
    newSections[index - 1] = current;
    newSections[index] = previous;
    newSections.forEach((section, idx) => {
      section.order = idx + 1;
    });
    onReorder(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedSections.length - 1) return;
    const newSections = [...sortedSections];
    const current = newSections[index];
    const next = newSections[index + 1];
    if (!current || !next) return;
    newSections[index] = next;
    newSections[index + 1] = current;
    newSections.forEach((section, idx) => {
      section.order = idx + 1;
    });
    onReorder(newSections);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateSection(editingId, formData);
      setEditingId(null);
    } else {
      onAddSection(formData as Omit<TemplateSection, 'id'>);
      setShowAddForm(false);
    }
    setFormData({
      sectionKey: '',
      title: '',
      content: '',
      isRequired: true,
      isAiAdaptable: false,
      order: sections.length + 1,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    });
  };

  const handleEdit = (section: TemplateSection) => {
    setEditingId(section.id);
    setFormData(section);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      sectionKey: '',
      title: '',
      content: '',
      isRequired: true,
      isAiAdaptable: false,
      order: sections.length + 1,
      applicableServiceLines: null,
      applicableProjectTypes: null,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-forvis-gray-900">
          Template Sections ({sections.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center"
          disabled={showAddForm || editingId !== null}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Section
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId !== null) && (
        <div className="card p-6 mb-6 border-2 border-forvis-blue-500">
          <h4 className="text-md font-semibold text-forvis-gray-900 mb-4">
            {editingId ? 'Edit Section' : 'Add New Section'}
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Section Key *
                </label>
                <input
                  type="text"
                  value={formData.sectionKey}
                  onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })}
                  placeholder="e.g., introduction"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Content * (Markdown)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                placeholder="Enter section content in markdown format..."
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="h-4 w-4 text-forvis-blue-500 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
                />
                <label htmlFor="isRequired" className="text-sm font-medium text-forvis-gray-700">
                  Required Section
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAiAdaptable"
                  checked={formData.isAiAdaptable}
                  onChange={(e) => setFormData({ ...formData, isAiAdaptable: e.target.checked })}
                  className="h-4 w-4 text-forvis-blue-500 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
                />
                <label htmlFor="isAiAdaptable" className="text-sm font-medium text-forvis-gray-700">
                  AI Adaptable
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button onClick={handleSave} className="btn-primary flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Save
              </button>
              <button onClick={handleCancel} className="btn-secondary flex items-center">
                <X className="h-5 w-5 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section List */}
      <div className="space-y-3">
        {sortedSections.map((section, index) => (
          <div
            key={section.id}
            className="card p-4 border-2 border-forvis-gray-200 hover:border-forvis-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-bold text-forvis-gray-500">
                    #{section.order}
                  </span>
                  <h4 className="text-md font-semibold text-forvis-gray-900">
                    {section.title}
                  </h4>
                  <span className="text-xs text-forvis-gray-500 font-mono">
                    ({section.sectionKey})
                  </span>
                </div>
                
                <p className="text-sm text-forvis-gray-600 mb-3 line-clamp-2">
                  {section.content.substring(0, 150)}...
                </p>

                <div className="flex items-center gap-3 text-xs">
                  {section.isRequired && (
                    <span className="px-2 py-1 bg-forvis-blue-100 text-forvis-blue-800 rounded">
                      Required
                    </span>
                  )}
                  {section.isAiAdaptable && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      AI Adaptable
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-2 hover:bg-forvis-gray-100 rounded disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sortedSections.length - 1}
                  className="p-2 hover:bg-forvis-gray-100 rounded disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleEdit(section)}
                  disabled={showAddForm || editingId !== null}
                  className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded disabled:opacity-30"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    setSectionToDelete(section.id);
                    setShowDeleteModal(true);
                  }}
                  disabled={showAddForm || editingId !== null}
                  className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sections.length === 0 && !showAddForm && (
        <div className="text-center py-12 border-2 border-dashed border-forvis-gray-300 rounded-lg">
          <p className="text-sm text-forvis-gray-600">
            No sections added yet. Click "Add Section" to create your first section.
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSectionToDelete(null);
        }}
        onConfirm={() => {
          if (sectionToDelete !== null) {
            onDeleteSection(sectionToDelete);
            setShowDeleteModal(false);
            setSectionToDelete(null);
          }
        }}
        title="Delete Section"
        message="Are you sure you want to delete this section?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

