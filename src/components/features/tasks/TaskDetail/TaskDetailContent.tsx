'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskType, Task, TaskTeam, TaskRole } from '@/types';
import { 
  Table,
  FileText,
  Calculator,
  Settings,
  Pencil,
  Archive,
  ClipboardList,
  Users,
  BookOpen,
  Mail,
  Folder,
  ClipboardCheck,
  FileCheck,
  CheckCircle,
  Lock,
  AlertTriangle,
  Plus
} from 'lucide-react';
import BalanceSheetPage from '@/app/dashboard/tasks/[id]/balance-sheet/page';
import IncomeStatementPage from '@/app/dashboard/tasks/[id]/income-statement/page';
import MappingPage from '@/app/dashboard/tasks/[id]/mapping/page';
import TaxCalculationPage from '@/app/dashboard/tasks/[id]/tax-calculation/page';
import ReportingPage from '@/app/dashboard/tasks/[id]/reporting/page';
import OpinionDraftingPage from '@/app/dashboard/tasks/[id]/opinion-drafting/page';
import { useTask } from '@/hooks/tasks/useTaskData';
import { useTaskTeam } from '@/hooks/tasks/useTaskTeam';
import { formatDate } from '@/lib/utils/taskUtils';
import { getTaskTypeColor, formatTaskType } from '@/lib/utils/serviceLineUtils';
import { LoadingSpinner, Button, Card, Banner, Input } from '@/components/ui';
import { ClientSelector } from '@/components/features/clients/ClientSelector';
import { TaskTypeSelector } from '@/components/features/tasks/TaskTypeSelector';
import { TaxYearInput } from '@/components/shared/TaxYearInput';
import { UserSearchModal } from '@/components/features/tasks/UserManagement/UserSearchModal';
import { AcceptanceTab } from '@/components/features/tasks/AcceptanceTab';
import { EngagementLetterTab } from '@/components/features/tasks/EngagementLetterTab';
import { GanttTimeline } from '@/components/features/tasks/TeamPlanner';
import { WorkSpaceTab } from '@/components/features/tasks/WorkSpaceTab';
import { TaskWorkspaceTab } from '@/components/features/tasks/TaskWorkspaceTab';
import { canAccessWorkTabs, isClientTask, getBlockedTabMessage } from '@/lib/utils/taskWorkflow';
import { DollarSign, Briefcase, FolderOpen } from 'lucide-react';

interface TabProps {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  tooltip?: string;
}

function Tab({ selected, children, onClick, icon: Icon, disabled = false, tooltip }: TabProps) {
  const button = (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
        disabled
          ? 'border-transparent text-forvis-gray-400 cursor-not-allowed opacity-60'
          : selected
          ? 'border-forvis-blue-600 text-forvis-blue-600'
          : 'border-transparent text-forvis-gray-600 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
      }`}
      title={tooltip}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
      {disabled && <Lock className="h-3 w-3 ml-1" />}
    </button>
  );

  if (disabled && tooltip) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-forvis-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-forvis-gray-900"></div>
        </div>
      </div>
    );
  }

  return button;
}

interface SettingsTabProps {
  task: Task;
  onUpdate: () => void;
  onArchive?: () => void;
}

function SettingsTab({ task, onUpdate, onArchive }: SettingsTabProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: task.name,
    description: task.description || '',
    clientId: task.client?.id || null,
    projectType: task.projectType as TaskType,
    taxYear: task.taxYear || new Date().getFullYear(),
    taxPeriodStart: task.taxPeriodStart instanceof Date ? task.taxPeriodStart : (task.taxPeriodStart ? new Date(task.taxPeriodStart) : null),
    taxPeriodEnd: task.taxPeriodEnd instanceof Date ? task.taxPeriodEnd : (task.taxPeriodEnd ? new Date(task.taxPeriodEnd) : null),
    assessmentYear: task.assessmentYear || '',
    submissionDeadline: task.submissionDeadline instanceof Date ? task.submissionDeadline : (task.submissionDeadline ? new Date(task.submissionDeadline) : null),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error('Failed to update task');
      
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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to archive task');
      
      if (onArchive) {
        onArchive();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Task Information */}
      <Card variant="standard" className="overflow-hidden">
        <div className="px-4 py-2 border-b border-forvis-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-forvis-gray-900">Task Information</h2>
          {!isEditing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<Pencil className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="px-4 py-3">
          {isEditing ? (
            <div className="space-y-4">
              <Input
                variant="text"
                label="Task Name"
                value={editData.name ?? ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
              <Input
                variant="textarea"
                label="Description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
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
                  Task Type
                </label>
                <TaskTypeSelector
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
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: task.name,
                      description: task.description || '',
                      clientId: task.client?.id || null,
                      projectType: task.projectType as TaskType,
                      taxYear: task.taxYear || new Date().getFullYear(),
                      taxPeriodStart: task.taxPeriodStart instanceof Date ? task.taxPeriodStart : (task.taxPeriodStart ? new Date(task.taxPeriodStart) : null),
                      taxPeriodEnd: task.taxPeriodEnd instanceof Date ? task.taxPeriodEnd : (task.taxPeriodEnd ? new Date(task.taxPeriodEnd) : null),
                      assessmentYear: task.assessmentYear || '',
                      submissionDeadline: task.submissionDeadline instanceof Date ? task.submissionDeadline : (task.submissionDeadline ? new Date(task.submissionDeadline) : null),
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  loading={isSubmitting}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Created</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{formatDate(task.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Last Updated</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{formatDate(task.updatedAt)}</dd>
                </div>
              </div>
              <div className="pt-2 text-sm text-forvis-gray-600">
                <p>Click "Edit" to modify task details, client assignment, and tax year information.</p>
              </div>
            </dl>
          )}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card variant="standard" className="border-red-200 overflow-hidden">
        <div className="px-4 py-2 border-b border-red-200 bg-red-50">
          <h2 className="text-base font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-forvis-gray-900">Archive this task</h3>
              <p className="text-xs text-forvis-gray-600 mt-1">
                Once archived, this task will be hidden from your dashboard. You can restore it later.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              icon={<Archive className="h-3.5 w-3.5" />}
            >
              Archive
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow-corporate-lg space-y-4">
            <h2 className="text-xl font-semibold text-forvis-gray-900">Archive Task</h2>
            <p className="text-sm text-forvis-gray-700">
              Are you sure you want to archive <span className="font-semibold">{task.name}</span>? 
              This will hide the task from your main view.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleArchive}
                loading={isSubmitting}
              >
                Archive Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface TaskDetailContentProps {
  taskId: string;
  serviceLine?: string;
  subServiceLineGroup?: string;
  clientId?: string;
  showHeader?: boolean;
  onUpdate?: () => void;
  onArchive?: () => void;
}

export function TaskDetailContent({
  taskId,
  serviceLine,
  subServiceLineGroup,
  clientId,
  showHeader = true,
  onUpdate,
  onArchive,
}: TaskDetailContentProps) {
  const searchParams = useSearchParams();
  const { data: task, isLoading, refetch: fetchTask } = useTask(taskId);

  const getDefaultTab = () => {
    if (!task) return 'acceptance';
    
    if (isClientTask(task)) {
      if (!task.acceptanceApproved) {
        return 'acceptance';
      }
      if (!task.engagementLetterUploaded) {
        return 'engagement-letter';
      }
    }
    
    switch (task.projectType) {
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
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<TaskRole>('VIEWER' as TaskRole);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const { 
    data: teamMembersData = [],
    isLoading: loadingTeam,
    refetch: refetchTeam 
  } = useTaskTeam(taskId, activeTab === 'team');

  const teamMembers: TaskTeam[] = teamMembersData.map(member => ({
    id: member.id,
    taskId: parseInt(taskId),
    userId: member.userId,
    role: member.role,
    createdAt: new Date(member.createdAt || Date.now()),
    startDate: member.startDate ? new Date(member.startDate) : undefined,
    endDate: member.endDate ? new Date(member.endDate) : undefined,
    allocatedHours: member.allocatedHours,
    allocatedPercentage: member.allocatedPercentage,
    actualHours: member.actualHours,
    User: member.User || member.user,
    taskName: (member as any).taskName,
    taskCode: (member as any).taskCode,
    clientName: (member as any).clientName,
    clientCode: (member as any).clientCode,
    allocations: member.allocations,
  }));

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else if (task) {
      setActiveTab(getDefaultTab());
    }
  }, [searchParams, task]);

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/users/me`);
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          setCurrentUserRole((data.role as TaskRole) || 'VIEWER');
          setCurrentUserId(data.userId || '');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setCurrentUserRole('VIEWER' as TaskRole);
      }
    };

    if (taskId) {
      fetchCurrentUserRole();
    }
  }, [taskId]);

  const handleUpdate = () => {
    fetchTask();
    if (onUpdate) {
      onUpdate();
    }
  };

  const renderContent = () => {
    const childParams = { id: taskId };
    
    switch (activeTab) {
      case 'acceptance':
        return task ? (
          <AcceptanceTab 
            task={task} 
            currentUserRole={currentUserRole}
            onApprovalComplete={handleUpdate}
          />
        ) : null;
      case 'engagement-letter':
        return task ? (
          <EngagementLetterTab 
            task={task} 
            currentUserRole={currentUserRole}
            onUploadComplete={handleUpdate}
          />
        ) : null;
      
      case 'finance':
        return <div className="p-6">Finance Tab (Coming Soon)</div>;
      
      case 'workspace':
        return task ? (
          <WorkSpaceTab 
            taskId={taskId} 
            subServiceLineGroup={(task as any).subServiceLineGroupCode || task.SLGroup || 'TAX'} 
          />
        ) : null;
      
      case 'documents':
        return task ? (
          <TaskWorkspaceTab taskId={taskId} />
        ) : null;
      
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
      
      case 'tax-opinion':
        return <OpinionDraftingPage params={childParams} />;
      
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
            <div className="max-w-full mx-auto">
              <Card variant="standard" className="p-6 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-forvis-gray-900">Team Planner</h2>
                    <p className="text-sm font-normal text-forvis-gray-600 mt-1">
                      {currentUserRole === 'ADMIN' 
                        ? 'Manage resource allocations and capacity • Your role: ADMIN' 
                        : `View team member allocations • Your role: ${currentUserRole || 'Loading...'}`
                      }
                    </p>
                  </div>

                  {currentUserRole ? (
                    <Button
                      variant="gradient"
                      size="md"
                      onClick={() => setShowAddUserModal(true)}
                      icon={<Plus className="w-5 h-5" />}
                    >
                      Add Team Member
                    </Button>
                  ) : (
                    <div className="text-sm text-forvis-gray-600 bg-forvis-gray-100 px-4 py-2 rounded-lg border-2 border-forvis-gray-300 shadow-corporate">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Only task members can add team members
                    </div>
                  )}
                </div>
              </Card>

              {loadingTeam ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                  <div className="h-20 bg-forvis-gray-200 rounded-lg"></div>
                </div>
              ) : (
                <GanttTimeline
                  taskId={parseInt(taskId)}
                  teamMembers={teamMembers}
                  currentUserRole={currentUserRole}
                  onAllocationUpdate={refetchTeam}
                />
              )}

              <UserSearchModal
                taskId={parseInt(taskId)}
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
        return task ? <SettingsTab task={task} onUpdate={handleUpdate} onArchive={onArchive} /> : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Banner
            variant="error"
            title="Task Not Found"
            message="The requested task could not be found."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workflow Status Banner */}
        {task && isClientTask(task) && !canAccessWorkTabs(task) && (
          <Banner
            variant="warning"
            title="Task Setup Required"
            message={
              !task.acceptanceApproved 
                ? 'Complete client acceptance and continuance to continue with this task.'
                : 'Upload the signed engagement letter to access task work tabs.'
            }
            className="mb-4"
          />
        )}

        {/* Task Header */}
        {showHeader && (
          <Card variant="standard" className="mb-4 overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h1 className="text-2xl font-semibold text-forvis-gray-900">{task.name}</h1>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTaskTypeColor(task.projectType)}`}>
                        {formatTaskType(task.projectType)}
                      </span>
                      {task.Active && task.Active !== 'Yes' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                          {task.Active === 'Archived' ? 'Archived' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    
                    {(task as any).masterServiceLine && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200">
                          {(task as any).masterServiceLine}
                        </span>
                        {(task as any).subServiceLineGroupCode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200">
                            {(task as any).subServiceLineGroupCode}
                          </span>
                        )}
                        {task.ServLineCode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200">
                            {task.ServLineCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {task.client && (
                    <p className="text-sm text-forvis-blue-600 font-medium">
                      {task.client.clientNameFull || task.client.clientCode}
                    </p>
                  )}
                  
                  {task.description && (
                    <p className="mt-1 text-sm font-normal text-forvis-gray-600">{task.description}</p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-forvis-gray-600">
                    {task.taxYear && (
                      <div className="flex items-center">
                        <span className="font-medium text-forvis-gray-700">Tax Year:</span>
                        <span className="ml-1">{task.taxYear}</span>
                      </div>
                    )}
                    {task.taxPeriodStart && task.taxPeriodEnd && (
                      <div className="flex items-center">
                        <span className="font-medium text-forvis-gray-700">Period:</span>
                        <span className="ml-1">
                          {formatDate(task.taxPeriodStart)} - {formatDate(task.taxPeriodEnd)}
                        </span>
                      </div>
                    )}
                    {task.submissionDeadline && (
                      <div className="flex items-center">
                        <span className="font-medium text-forvis-gray-700">Due:</span>
                        <span className="ml-1">{formatDate(task.submissionDeadline)}</span>
                      </div>
                    )}
                    {task.TaskPartnerName && (
                      <div className="flex items-center">
                        <span className="font-medium text-forvis-gray-700">Partner:</span>
                        <span className="ml-1">{task.TaskPartnerName || task.TaskPartner}</span>
                      </div>
                    )}
                    {task.TaskManagerName && (
                      <div className="flex items-center">
                        <span className="font-medium text-forvis-gray-700">Manager:</span>
                        <span className="ml-1">{task.TaskManagerName || task.TaskManager}</span>
                      </div>
                    )}
                    <span>•</span>
                    <span>{task._count?.mappings ?? 0} accounts</span>
                    <span>{task._count?.taxAdjustments ?? 0} adjustments</span>
                    {task.users && (
                      <span>{task.users.length} team members</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-forvis-gray-200">
              <nav className="flex space-x-6 px-4 overflow-x-auto" aria-label="Tabs">
                {task && isClientTask(task) && (
                  <>
                    <Tab
                      onClick={() => setActiveTab('acceptance')}
                      selected={activeTab === 'acceptance'}
                      icon={CheckCircle}
                    >
                      Acceptance
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('engagement-letter')}
                      selected={activeTab === 'engagement-letter'}
                      icon={FileText}
                      disabled={!task.acceptanceApproved}
                      tooltip={!task.acceptanceApproved ? 'Complete client acceptance first' : undefined}
                    >
                      Engagement Letter
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('team')}
                      selected={activeTab === 'team'}
                      icon={Users}
                    >
                      Team
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('finance')}
                      selected={activeTab === 'finance'}
                      icon={DollarSign}
                    >
                      Finance
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('workspace')}
                      selected={activeTab === 'workspace'}
                      icon={Briefcase}
                    >
                      Tools
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('documents')}
                      selected={activeTab === 'documents'}
                      icon={FolderOpen}
                    >
                      Documents
                    </Tab>
                  </>
                )}
                
                {!task || !isClientTask(task) && (
                  <>
                    <Tab
                      onClick={() => setActiveTab('team')}
                      selected={activeTab === 'team'}
                      icon={Users}
                    >
                      Team
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('finance')}
                      selected={activeTab === 'finance'}
                      icon={DollarSign}
                    >
                      Finance
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('workspace')}
                      selected={activeTab === 'workspace'}
                      icon={Briefcase}
                    >
                      Tools
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('documents')}
                      selected={activeTab === 'documents'}
                      icon={FolderOpen}
                    >
                      Documents
                    </Tab>
                  </>
                )}
                
                {task.projectType === 'TAX_CALCULATION' && (!task.serviceLine || task.serviceLine === 'TAX') && (
                  <>
                    <Tab
                      onClick={() => setActiveTab('mapping')}
                      selected={activeTab === 'mapping'}
                      icon={Table}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Mapping
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('balance-sheet')}
                      selected={activeTab === 'balance-sheet'}
                      icon={FileText}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Balance Sheet
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('income-statement')}
                      selected={activeTab === 'income-statement'}
                      icon={FileText}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Income Statement
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('tax-calculation')}
                      selected={activeTab === 'tax-calculation'}
                      icon={Calculator}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Tax Calculation
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('reporting')}
                      selected={activeTab === 'reporting'}
                      icon={ClipboardList}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Reporting
                    </Tab>
                  </>
                )}
                
                {task.projectType === 'TAX_OPINION' && (!task.serviceLine || task.serviceLine === 'TAX') && (
                  <Tab
                    onClick={() => setActiveTab('tax-opinion')}
                    selected={activeTab === 'tax-opinion'}
                    icon={BookOpen}
                    disabled={!canAccessWorkTabs(task)}
                    tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                  >
                    Tax Opinion
                  </Tab>
                )}
                
                {task.projectType === 'TAX_ADMINISTRATION' && (!task.serviceLine || task.serviceLine === 'TAX') && (
                  <>
                    <Tab
                      onClick={() => setActiveTab('sars-responses')}
                      selected={activeTab === 'sars-responses'}
                      icon={Mail}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      SARS Responses
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('document-management')}
                      selected={activeTab === 'document-management'}
                      icon={Folder}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Document Management
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('compliance-checklist')}
                      selected={activeTab === 'compliance-checklist'}
                      icon={ClipboardCheck}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Compliance Checklist
                    </Tab>
                    <Tab
                      onClick={() => setActiveTab('filing-status')}
                      selected={activeTab === 'filing-status'}
                      icon={FileCheck}
                      disabled={!canAccessWorkTabs(task)}
                      tooltip={!canAccessWorkTabs(task) ? getBlockedTabMessage(task) : undefined}
                    >
                      Filing Status
                    </Tab>
                  </>
                )}
                
                <Tab
                  onClick={() => setActiveTab('settings')}
                  selected={activeTab === 'settings'}
                  icon={Settings}
                >
                  Settings
                </Tab>
              </nav>
            </div>
          </Card>
        )}

        {/* Tab Content */}
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}










