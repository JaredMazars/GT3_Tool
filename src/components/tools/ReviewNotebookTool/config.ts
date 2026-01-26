/**
 * Review Notebook Tool Configuration
 */

import type { ToolModuleConfig } from '../types';

export const reviewNotebookToolConfig: ToolModuleConfig = {
  code: 'review-notebook',
  name: 'Review Notebook',
  description: 'Track and manage review notes on files and resources',
  version: '1.0.0',
  defaultSubTabs: [
    {
      id: 'active-notes',
      label: 'Active Notes',
      icon: 'ClipboardList',
    },
    {
      id: 'resolved-notes',
      label: 'Resolved',
      icon: 'CheckCircle2',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart3',
    },
  ],
};

// Priority level configuration
export const PRIORITY_CONFIG = {
  CRITICAL: {
    label: 'Critical',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
  },
  HIGH: {
    label: 'High',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
  },
  LOW: {
    label: 'Low',
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500',
  },
};

// Status configuration
export const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800',
    icon: 'Circle',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-purple-100 text-purple-800',
    icon: 'Clock',
  },
  ADDRESSED: {
    label: 'Addressed',
    color: 'bg-indigo-100 text-indigo-800',
    icon: 'MessageSquare',
  },
  CLEARED: {
    label: 'Cleared',
    color: 'bg-green-100 text-green-800',
    icon: 'CheckCircle2',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: 'XCircle',
  },
};

