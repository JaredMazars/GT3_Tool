'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

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
  active: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: TemplateSection[];
}

interface TemplateListProps {
  templates: Template[];
  onDelete?: (id: number) => void;
  onToggleActive?: (id: number, active: boolean) => void;
  onCopy?: (id: number) => void;
}

export function TemplateList({ templates, onDelete, onToggleActive, onCopy }: TemplateListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterServiceLine, setFilterServiceLine] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || template.type === filterType;
    const matchesServiceLine = !filterServiceLine || template.serviceLine === filterServiceLine;
    
    return matchesSearch && matchesType && matchesServiceLine;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="ENGAGEMENT_LETTER">Engagement Letter</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="AGREEMENT">Agreement</option>
        </select>

        <select
          value={filterServiceLine}
          onChange={(e) => setFilterServiceLine(e.target.value)}
          className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
        >
          <option value="">All Service Lines</option>
          <option value="TAX">Tax</option>
          <option value="AUDIT">Audit</option>
          <option value="ACCOUNTING">Accounting</option>
          <option value="ADVISORY">Advisory</option>
        </select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="card p-6 hover:shadow-corporate-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="p-2 bg-forvis-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-forvis-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-forvis-gray-900">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-forvis-gray-600 mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-forvis-gray-600">Type:</span>
                <span className="font-medium text-forvis-gray-900">
                  {template.type.replace(/_/g, ' ')}
                </span>
              </div>
              
              {template.serviceLine && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-forvis-gray-600">Service Line:</span>
                  <span className="font-medium text-forvis-gray-900">
                    {template.serviceLine}
                  </span>
                </div>
              )}


              <div className="flex items-center justify-between text-sm">
                <span className="text-forvis-gray-600">Sections:</span>
                <span className="font-medium text-forvis-gray-900">
                  {template.sections?.length ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-forvis-gray-600">Status:</span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    template.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-forvis-gray-100 text-forvis-gray-800'
                  }`}
                >
                  {template.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-forvis-gray-200">
              <Link
                href={`/dashboard/admin/templates/${template.id}`}
                className="flex-1 btn-primary text-center"
              >
                <Pencil className="h-4 w-4 mr-2 inline" />
                Edit
              </Link>
              
              {onCopy && (
                <button
                  onClick={async () => {
                    setCopyingId(template.id);
                    await onCopy(template.id);
                    setCopyingId(null);
                  }}
                  disabled={copyingId === template.id}
                  className="p-2 text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy template"
                >
                  <Copy className="h-5 w-5" />
                </button>
              )}

              {onToggleActive && (
                <button
                  onClick={() => onToggleActive(template.id, !template.active)}
                  className="px-3 py-2 text-sm font-medium border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50"
                >
                  {template.active ? 'Deactivate' : 'Activate'}
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => {
                    setTemplateToDelete(template.id);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete template"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-forvis-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-forvis-gray-900 mb-1">
            No templates found
          </h3>
          <p className="text-sm text-forvis-gray-600">
            {searchTerm || filterType || filterServiceLine
              ? 'Try adjusting your filters'
              : 'Get started by creating a new template'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
        }}
        onConfirm={() => {
          if (templateToDelete !== null && onDelete) {
            onDelete(templateToDelete);
            setShowDeleteModal(false);
            setTemplateToDelete(null);
          }
        }}
        title="Delete Template"
        message="Are you sure you want to delete this template?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}













