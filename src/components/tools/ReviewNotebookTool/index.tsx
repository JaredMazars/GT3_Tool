/**
 * Review Notebook Tool
 * Main component with tabs for managing review notes
 */

'use client';

import { useState } from 'react';
import { ClipboardList, CheckCircle2, BarChart3 } from 'lucide-react';
import { reviewNotebookToolConfig } from './config';
import type { ToolComponentProps } from '../types';
import ReviewNoteList from './components/ReviewNoteList';
import ReviewNoteAnalytics from './components/ReviewNoteAnalytics';
import { ReviewNoteStatus } from '@/types/review-notes';

export function ReviewNotebookTool({ taskId, initialNoteId }: ToolComponentProps) {
  // If initialNoteId is provided, determine which tab it should be in
  // For now, default to 'active' - the ReviewNoteList component will handle finding it
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'analytics'>('active');

  const tabs = [
    { id: 'active' as const, label: 'Active Notes', icon: ClipboardList },
    { id: 'resolved' as const, label: 'Resolved', icon: CheckCircle2 },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* Tool Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-forvis-gray-900">
            {reviewNotebookToolConfig.name}
          </h3>
          <p className="text-sm text-forvis-gray-600">{reviewNotebookToolConfig.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-forvis-gray-200">
        <nav className="flex space-x-6" aria-label="Tool tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-forvis-blue-600 text-forvis-blue-600'
                    : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'active' && (
          <ReviewNoteList 
            taskId={Number(taskId)} 
            statusFilter={[ReviewNoteStatus.OPEN, ReviewNoteStatus.IN_PROGRESS, ReviewNoteStatus.ADDRESSED]}
            initialNoteId={initialNoteId}
          />
        )}
        {activeTab === 'resolved' && (
          <ReviewNoteList 
            taskId={Number(taskId)} 
            statusFilter={[ReviewNoteStatus.CLEARED, ReviewNoteStatus.REJECTED]}
            initialNoteId={initialNoteId}
          />
        )}
        {activeTab === 'analytics' && <ReviewNoteAnalytics taskId={Number(taskId)} />}
      </div>
    </div>
  );
}

export { reviewNotebookToolConfig } from './config';

