'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ProjectType, Project } from '@/types';
import { 
  ChevronRightIcon,
  TableCellsIcon,
  DocumentTextIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  BookOpenIcon,
  EnvelopeIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';
import BalanceSheetPage from '@/app/dashboard/projects/[id]/balance-sheet/page';
import IncomeStatementPage from '@/app/dashboard/projects/[id]/income-statement/page';
import MappingPage from '@/app/dashboard/projects/[id]/mapping/page';
import TaxCalculationPage from '@/app/dashboard/projects/[id]/tax-calculation/page';
import ReportingPage from '@/app/dashboard/projects/[id]/reporting/page';
import OpinionDraftingPage from '@/app/dashboard/projects/[id]/opinion-drafting/page';
import { useProject } from '@/hooks/projects/useProjectData';
import { useProjectTeam } from '@/hooks/projects/useProjectTeam';
import { formatDate } from '@/lib/utils/projectUtils';
import { getProjectTypeColor, formatProjectType } from '@/lib/utils/serviceLineUtils';
import { isSharedService, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { ClientSelector } from '@/components/features/clients/ClientSelector';
import { ProjectTypeSelector } from '@/components/features/projects/ProjectTypeSelector';
import { TaxYearInput } from '@/components/shared/TaxYearInput';
import { ProjectUserList } from '@/components/features/projects/UserManagement/ProjectUserList';
import { UserSearchModal } from '@/components/features/projects/UserManagement/UserSearchModal';
import { ProjectUser, ProjectRole } from '@/types';

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
          ? 'border-forvis-blue-600 text-forvis-blue-600'
          : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

interface SettingsTabProps {
  project: Project;
  onUpdate: () => void;
}

function SettingsTab({ project, onUpdate }: SettingsTabProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || '',
    clientId: project.clientId || null,
    projectType: project.projectType as ProjectType,
    taxYear: project.taxYear || new Date().getFullYear(),
    taxPeriodStart: project.taxPeriodStart instanceof Date ? project.taxPeriodStart : (project.taxPeriodStart ? new Date(project.taxPeriodStart) : null),
    taxPeriodEnd: project.taxPeriodEnd instanceof Date ? project.taxPeriodEnd : (project.taxPeriodEnd ? new Date(project.taxPeriodEnd) : null),
    assessmentYear: project.assessmentYear || '',
    submissionDeadline: project.submissionDeadline instanceof Date ? project.submissionDeadline : (project.submissionDeadline ? new Date(project.submissionDeadline) : null),
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Project Information */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 border-b border-forvis-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-forvis-gray-900">Project Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors"
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
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Client
                </label>
                <ClientSelector
                  value={editData.clientId}
                  onChange={(clientId) => setEditData({ ...editData, clientId })}
                  allowCreate={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Project Type
                </label>
                <ProjectTypeSelector
                  value={editData.projectType}
                  onChange={(projectType) => setEditData({ ...editData, projectType })}
                />
              </div>
              <div>
                <TaxYearInput
                  taxYear={editData.taxYear}
                  taxPeriodStart={editData.taxPeriodStart}
                  taxPeriodEnd={editData.taxPeriodEnd}
                  assessmentYear={editData.assessmentYear}
                  submissionDeadline={editData.submissionDeadline}
                  onChange={(field, value) => setEditData({ ...editData, [field]: value })}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: project.name,
                      description: project.description || '',
                      clientId: project.clientId || null,
                      projectType: project.projectType as ProjectType,
                      taxYear: project.taxYear || new Date().getFullYear(),
                      taxPeriodStart: project.taxPeriodStart instanceof Date ? project.taxPeriodStart : (project.taxPeriodStart ? new Date(project.taxPeriodStart) : null),
                      taxPeriodEnd: project.taxPeriodEnd instanceof Date ? project.taxPeriodEnd : (project.taxPeriodEnd ? new Date(project.taxPeriodEnd) : null),
                      assessmentYear: project.assessmentYear || '',
                      submissionDeadline: project.submissionDeadline instanceof Date ? project.submissionDeadline : (project.submissionDeadline ? new Date(project.submissionDeadline) : null),
                    });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Name</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Description</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">
                  {project.description || 'No description provided'}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Created</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Last Updated</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{formatDate(project.updatedAt)}</dd>
                </div>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Project Statistics */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 border-b border-forvis-gray-200">
          <h2 className="text-base font-semibold text-forvis-gray-900">Project Statistics</h2>
        </div>
        <div className="px-4 py-3">
          <dl className="grid grid-cols-2 gap-4">
            <div className="bg-forvis-blue-50 rounded-lg p-3 border border-forvis-blue-100">
              <dt className="text-xs font-medium text-forvis-blue-800">Mapped Accounts</dt>
              <dd className="mt-1 text-xl font-semibold text-forvis-blue-600">
                {project._count?.mappings ?? 0}
              </dd>
            </div>
            <div className="bg-forvis-blue-100 rounded-lg p-3 border border-forvis-blue-200">
              <dt className="text-xs font-medium text-forvis-blue-900">Tax Adjustments</dt>
              <dd className="mt-1 text-xl font-semibold text-forvis-blue-700">
                {project._count?.taxAdjustments ?? 0}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-corporate">
        <div className="px-4 py-2 border-b border-red-200 bg-red-50">
          <h2 className="text-base font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-forvis-gray-900">Archive this project</h3>
              <p className="text-xs text-forvis-gray-600 mt-1">
                Once archived, this project will be hidden from your dashboard. You can restore it later.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
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
          <div className="bg-white rounded-lg shadow-corporate-lg p-4 w-full max-w-md">
            <h2 className="text-xl font-bold mb-3 text-forvis-gray-900">Archive Project</h2>
            <p className="text-sm text-forvis-gray-700 mb-4">
              Are you sure you want to archive <span className="font-semibold">{project.name}</span>? 
              This will hide the project from your main view.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-corporate"
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

export default function InternalProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const projectId = params.projectId as string;
  
  const { data: project, isLoading, refetch: fetchProject } = useProject(projectId);
  
  // Set default active tab based on project type
  const getDefaultTab = () => {
    if (!project) return 'team';
    switch (project.projectType) {
      case 'TAX_CALCULATION':
        return 'mapping';
      case 'TAX_OPINION':
        return 'tax-opinion';
      case 'TAX_ADMINISTRATION':
        return 'sars-responses';
      default:
        return 'team';
    }
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  
  // Team management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole>('VIEWER' as ProjectRole);
  
  // Lazy load team members only when team tab is active
  const { 
    data: teamMembersData = [],
    isLoading: loadingTeam,
    refetch: refetchTeam 
  } = useProjectTeam(projectId, activeTab === 'team');
  
  // Convert ProjectTeamMember[] to ProjectUser[] format
  const teamMembers: ProjectUser[] = teamMembersData.map(member => ({
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: member.role,
    createdAt: new Date(member.createdAt),
    User: member.User,
  }));

  // Handle tab query parameter and update default tab when project loads
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else if (project) {
      // Set default tab based on project type when project loads
      setActiveTab(getDefaultTab());
    }
  }, [searchParams, project]);

  // Fetch current user role when team tab is active
  useEffect(() => {
    if (activeTab === 'team') {
      fetchCurrentUserRole();
    }
  }, [activeTab, projectId]);

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      const projectUsers = data.data?.ProjectUser || data.data?.projectUser || data.data?.users || [];
      if (data.success && projectUsers.length > 0) {
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        if (sessionData.user) {
          const currentUser = projectUsers.find((u: ProjectUser) => {
            const userId = u.User?.id || u.user?.id || u.userId;
            return userId === sessionData.user.id;
          });
          if (currentUser) {
            setCurrentUserId(sessionData.user.id);
            setCurrentUserRole(currentUser.role);
          }
        }
      }
    } catch (error) {
      // Silently fail - user may not be on team
    }
  };

  const renderContent = () => {
    // Create params object for child pages
    const childParams = { id: projectId };
    
    switch (activeTab) {
      // Tax Calculation tabs
      case 'mapping':
        return <MappingPage params={childParams} />;
      case 'balance-sheet':
        return <BalanceSheetPage params={childParams} />;
      case 'income-statement':
        return <IncomeStatementPage params={childParams} />;
      case 'tax-calculation':
        return <TaxCalculationPage params={childParams} />;
      case 'reporting':
        return <ReportingPage params={childParams} />;
      
      // Tax Opinion tab (unified)
      case 'tax-opinion':
        return <OpinionDraftingPage params={childParams} />;
      
      // Tax Administration tabs (placeholder components - will be created)
      case 'sars-responses':
        return <div className="p-6">SARS Responses Page (Coming Soon)</div>;
      case 'document-management':
        return <div className="p-6">Document Management Page (Coming Soon)</div>;
      case 'compliance-checklist':
        return <div className="p-6">Compliance Checklist Page (Coming Soon)</div>;
      case 'filing-status':
        return <div className="p-6">Filing Status Page (Coming Soon)</div>;
      
      case 'team':
        return (
          <div className="p-6 bg-forvis-gray-50">
            <div className="max-w-5xl mx-auto">
              {/* Header Card */}
              <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-forvis-gray-900">Team Members</h2>
                    <p className="text-sm text-forvis-gray-600 mt-1">
                      {currentUserRole === 'ADMIN' 
                        ? 'Manage project access and roles' 
                        : `View team members • Your role: ${currentUserRole || 'Loading...'}`
                      }
                    </p>
                  </div>

                  {currentUserRole ? (
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Team Member
                    </button>
                  ) : (
                    <div className="text-sm text-forvis-gray-600 bg-forvis-gray-100 px-4 py-2 rounded-lg border-2 border-forvis-gray-300 shadow-corporate">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Only project members can add team members
                    </div>
                  )}
                </div>
              </div>

              {loadingTeam ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                </div>
              ) : (
                <ProjectUserList
                  projectId={parseInt(projectId)}
                  users={teamMembers}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onUserRemoved={refetchTeam}
                  onRoleChanged={refetchTeam}
                />
              )}

              <UserSearchModal
                projectId={parseInt(projectId)}
                isOpen={showAddUserModal}
                onClose={() => setShowAddUserModal(false)}
                onUserAdded={() => {
                  refetchTeam();
                  setShowAddUserModal(false);
                }}
              />
            </div>
          </div>
        );
      case 'settings':
        return project ? <SettingsTab project={project} onUpdate={fetchProject} /> : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/internal`} 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            Internal Projects
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          
          <span className="text-forvis-gray-900 font-medium">{project?.name}</span>
        </nav>

        {/* Project Header */}
        <div className="card-hover mb-4 overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-forvis-gray-900">{project?.name}</h1>
                  {project && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getProjectTypeColor(project.projectType)}`}>
                      {formatProjectType(project.projectType)}
                    </span>
                  )}
                </div>
                
                {project?.description && (
                  <p className="mt-1 text-sm text-forvis-gray-700">{project.description}</p>
                )}
                
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-forvis-gray-600">
                  {project?.taxYear && (
                    <div className="flex items-center">
                      <span className="font-medium text-forvis-gray-700">Tax Year:</span>
                      <span className="ml-1">{project.taxYear}</span>
                    </div>
                  )}
                  {project?.taxPeriodStart && project?.taxPeriodEnd && (
                    <div className="flex items-center">
                      <span className="font-medium text-forvis-gray-700">Period:</span>
                      <span className="ml-1">
                        {formatDate(project.taxPeriodStart)} - {formatDate(project.taxPeriodEnd)}
                      </span>
                    </div>
                  )}
                  {project?.submissionDeadline && (
                    <div className="flex items-center">
                      <span className="font-medium text-forvis-gray-700">Due:</span>
                      <span className="ml-1">{formatDate(project.submissionDeadline)}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>{project?._count?.mappings ?? 0} accounts</span>
                  <span>{project?._count?.taxAdjustments ?? 0} adjustments</span>
                  {project?.users && (
                    <span>{project.users.length} team members</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-forvis-gray-200">
            <nav className="flex space-x-6 px-4 overflow-x-auto" aria-label="Tabs">
              {/* Tax Calculation Tabs - Only for TAX service line */}
              {project?.projectType === 'TAX_CALCULATION' && (!project?.serviceLine || project?.serviceLine === 'TAX') && (
                <>
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
                </>
              )}
              
              {/* Tax Opinion Tab - Only for TAX service line */}
              {project?.projectType === 'TAX_OPINION' && (!project?.serviceLine || project?.serviceLine === 'TAX') && (
                <Tab
                  onClick={() => setActiveTab('tax-opinion')}
                  selected={activeTab === 'tax-opinion'}
                  icon={BookOpenIcon}
                >
                  Tax Opinion
                </Tab>
              )}
              
              {/* Tax Administration Tabs - Only for TAX service line */}
              {project?.projectType === 'TAX_ADMINISTRATION' && (!project?.serviceLine || project?.serviceLine === 'TAX') && (
                <>
                  <Tab
                    onClick={() => setActiveTab('sars-responses')}
                    selected={activeTab === 'sars-responses'}
                    icon={EnvelopeIcon}
                  >
                    SARS Responses
                  </Tab>
                  <Tab
                    onClick={() => setActiveTab('document-management')}
                    selected={activeTab === 'document-management'}
                    icon={FolderIcon}
                  >
                    Document Management
                  </Tab>
                  <Tab
                    onClick={() => setActiveTab('compliance-checklist')}
                    selected={activeTab === 'compliance-checklist'}
                    icon={ClipboardDocumentCheckIcon}
                  >
                    Compliance Checklist
                  </Tab>
                  <Tab
                    onClick={() => setActiveTab('filing-status')}
                    selected={activeTab === 'filing-status'}
                    icon={DocumentCheckIcon}
                  >
                    Filing Status
                  </Tab>
                </>
              )}
              
              {/* Common Tabs for all project types */}
              <Tab
                onClick={() => setActiveTab('team')}
                selected={activeTab === 'team'}
                icon={UsersIcon}
              >
                Team
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
