'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronRightIcon,
  TableCellsIcon,
  DocumentTextIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import BalanceSheetPage from './balance-sheet/page';
import IncomeStatementPage from './income-statement/page';
import MappingPage from './mapping/page';
import TaxCalculationPage from './tax-calculation/page';
import ReportingPage from './reporting/page';

interface TabProps {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

function Tab({ selected, children, onClick, icon: Icon }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
        selected
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

interface ProjectData {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    mappings: number;
    taxAdjustments: number;
  };
}

interface SettingsTabProps {
  project: ProjectData;
  onUpdate: () => void;
}

function SettingsTab({ project, onUpdate }: SettingsTabProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error('Failed to update project');
      
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to archive project');
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Error archiving project:', error);
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Project Information */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Project Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PencilIcon className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({ name: project.name, description: project.description || '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {project.description || 'No description provided'}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(project.updatedAt)}</dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Project Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Project Statistics</h2>
        </div>
        <div className="px-4 py-3">
          <dl className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <dt className="text-xs font-medium text-blue-900">Mapped Accounts</dt>
              <dd className="mt-1 text-xl font-semibold text-blue-600">
                {project._count.mappings}
              </dd>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <dt className="text-xs font-medium text-purple-900">Tax Adjustments</dt>
              <dd className="mt-1 text-xl font-semibold text-purple-600">
                {project._count.taxAdjustments}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
        <div className="px-4 py-2 border-b border-red-200 bg-red-50">
          <h2 className="text-base font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-900">Archive this project</h3>
              <p className="text-xs text-gray-600 mt-1">
                Once archived, this project will be hidden from your dashboard. You can restore it later.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100"
            >
              <ArchiveBoxIcon className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md">
            <h2 className="text-xl font-bold mb-3 text-gray-900">Archive Project</h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to archive <span className="font-semibold">{project.name}</span>? 
              This will hide the project from your main view.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('mapping');
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [params.id]);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeTab) {
      case 'mapping':
        return <MappingPage params={params} />;
      case 'balance-sheet':
        return <BalanceSheetPage params={params} />;
      case 'income-statement':
        return <IncomeStatementPage params={params} />;
      case 'tax-calculation':
        return <TaxCalculationPage params={params} />;
      case 'reporting':
        return <ReportingPage params={params} />;
      case 'settings':
        return project ? <SettingsTab project={project} onUpdate={fetchProject} /> : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            Projects
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-gray-900 font-medium">{project?.name}</span>
        </nav>

        {/* Project Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
                {project?.description && (
                  <p className="mt-1 text-sm text-gray-600">{project.description}</p>
                )}
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>{project?._count.mappings} accounts mapped</span>
                  <span>{project?._count.taxAdjustments} adjustments</span>
                  <span>Updated {project && new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-6 px-4" aria-label="Tabs">
              <Tab
                onClick={() => setActiveTab('mapping')}
                selected={activeTab === 'mapping'}
                icon={TableCellsIcon}
              >
                Mapping
              </Tab>
              <Tab
                onClick={() => setActiveTab('balance-sheet')}
                selected={activeTab === 'balance-sheet'}
                icon={DocumentTextIcon}
              >
                Balance Sheet
              </Tab>
              <Tab
                onClick={() => setActiveTab('income-statement')}
                selected={activeTab === 'income-statement'}
                icon={DocumentTextIcon}
              >
                Income Statement
              </Tab>
              <Tab
                onClick={() => setActiveTab('tax-calculation')}
                selected={activeTab === 'tax-calculation'}
                icon={CalculatorIcon}
              >
                Tax Calculation
              </Tab>
              <Tab
                onClick={() => setActiveTab('reporting')}
                selected={activeTab === 'reporting'}
                icon={ClipboardDocumentListIcon}
              >
                Reporting
              </Tab>
              <Tab
                onClick={() => setActiveTab('settings')}
                selected={activeTab === 'settings'}
                icon={Cog6ToothIcon}
              >
                Settings
              </Tab>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 