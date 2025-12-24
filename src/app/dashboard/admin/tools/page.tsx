'use client';

import { useState } from 'react';
import { ToolList } from '@/components/features/admin/tools/ToolList';
import { AssignmentModal } from '@/components/features/admin/tools/AssignmentModal';

interface Tool {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  active: boolean;
  sortOrder: number;
  subTabs: Array<{
    id: number;
    name: string;
    code: string;
  }>;
  serviceLines: Array<{
    id: number;
    subServiceLineGroup: string;
    active: boolean;
  }>;
  _count: {
    tasks: number;
    subTabs: number;
    serviceLines: number;
  };
}

export default function ToolsAdminPage() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const handleManageAssignments = (tool: Tool) => {
    setSelectedTool(tool);
  };

  const handleCloseModal = () => {
    setSelectedTool(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-forvis-gray-900">Tool Management</h1>
        <p className="text-sm text-forvis-gray-600 mt-1">
          Manage tools and their assignments to sub-service line groups
        </p>
      </div>

      <ToolList onManageAssignments={handleManageAssignments} />

      {selectedTool && (
        <AssignmentModal
          tool={selectedTool}
          isOpen={!!selectedTool}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}








