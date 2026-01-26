'use client';

import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Bell, Archive, ShieldCheck } from 'lucide-react';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { useApprovals } from '@/hooks/approvals/useApprovals';
import { LoadingSpinner } from '@/components/ui';
import { ChangeRequestApprovalItem } from './ChangeRequestApprovalItem';
import { ClientAcceptanceApprovalItem } from './ClientAcceptanceApprovalItem';
import { EngagementAcceptanceApprovalItem } from './EngagementAcceptanceApprovalItem';
import { ReviewNoteApprovalItem } from './ReviewNoteApprovalItem';
import { IndependenceConfirmationItem } from './IndependenceConfirmationItem';
import { UnifiedApprovalCard } from './UnifiedApprovalCard';
import { NotificationItem } from '@/components/features/notifications/NotificationItem';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useApproveStep, useRejectStep } from '@/hooks/approvals/useUnifiedApprovals';
import { ApproveChangeRequestModal } from '@/components/features/clients/ApproveChangeRequestModal';
import { TaskDetailModal } from '@/components/features/tasks/TaskDetail/TaskDetailModal';
import { 
  NOTIFICATION_CATEGORIES, 
  getTypesForCategory, 
  groupNotificationsByCategory,
  type NotificationCategory 
} from '@/lib/utils/notificationGrouping';
import type { ReadStatusFilter } from '@/types/notification';

type TabType = 'approvals' | 'notifications';
type ApprovalTypeTab = 'all' | 'changeRequests' | 'clientAcceptance' | 'engagementAcceptance' | 'reviewNotes' | 'vaultDocuments' | 'independenceConfirmations';

export function MyApprovalsView() {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('approvals');
  const [activeApprovalType, setActiveApprovalType] = useState<ApprovalTypeTab>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [modalRequestId, setModalRequestId] = useState<number | null>(null);
  const [notificationPage, setNotificationPage] = useState(1);
  const [activeNotificationType, setActiveNotificationType] = useState<NotificationCategory>('all');
  const [notificationReadFilter, setNotificationReadFilter] = useState<ReadStatusFilter>('all');
  const [selectedTask, setSelectedTask] = useState<{
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
    noteId?: number;
    initialTab?: string;
  } | null>(null);
  
  const { data: approvalsData, isLoading: isLoadingApprovals, refetch } = useApprovals(showArchived);
  const approveStep = useApproveStep();
  const rejectStep = useRejectStep();
  
  // Build notification filters
  const notificationFilters = useMemo(() => {
    const types = getTypesForCategory(activeNotificationType);
    return {
      page: notificationPage,
      pageSize: 20,
      types: types.length > 0 ? types : undefined,
      readStatus: notificationReadFilter,
    };
  }, [notificationPage, activeNotificationType, notificationReadFilter]);
  
  const { data: notificationsData, isLoading: isLoadingNotifications } = useNotifications(notificationFilters);

  const totalNotificationPages = notificationsData
    ? Math.ceil(notificationsData.totalCount / 20)
    : 1;

  // Group notifications by category for display
  const groupedNotifications = useMemo(() => {
    if (!notificationsData?.notifications) return null;
    return groupNotificationsByCategory(notificationsData.notifications);
  }, [notificationsData?.notifications]);

  // Get category counts for badges
  const notificationCategoryCounts = useMemo(() => {
    if (!groupedNotifications) return { all: 0, userChanges: 0, messages: 0, documentsAndTasks: 0 };
    return {
      all: groupedNotifications.all.length,
      userChanges: groupedNotifications.userChanges.length,
      messages: groupedNotifications.messages.length,
      documentsAndTasks: groupedNotifications.documentsAndTasks.length,
    };
  }, [groupedNotifications]);

  const handleOpenTaskModal = (taskData: {
    taskId: string;
    serviceLine?: string;
    subServiceLineGroup?: string;
    clientId?: string;
    noteId?: number;
    initialTab?: string;
  }) => {
    setSelectedTask(taskData);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    // Refresh approvals data
    refetch();
  };

  // Separate client acceptances from other centralized approvals
  const clientAcceptanceApprovals = useMemo(() => {
    return approvalsData?.centralizedApprovals?.filter(
      (approval) => approval.workflowType === 'CLIENT_ACCEPTANCE'
    ) || [];
  }, [approvalsData?.centralizedApprovals]);

  const otherCentralizedApprovals = useMemo(() => {
    return approvalsData?.centralizedApprovals?.filter(
      (approval) => approval.workflowType !== 'CLIENT_ACCEPTANCE'
    ) || [];
  }, [approvalsData?.centralizedApprovals]);


  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation */}
      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200">
        <div className="border-b border-forvis-gray-200">
          <div className="flex items-center justify-between p-2">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveSubTab('approvals')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeSubTab === 'approvals'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-100'
                }`}
                style={
                  activeSubTab === 'approvals'
                    ? { background: GRADIENTS.icon.standard }
                    : {}
                }
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Approvals</span>
                {approvalsData && approvalsData.totalCount > 0 && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeSubTab === 'approvals'
                        ? 'bg-white/30 text-white'
                        : 'bg-forvis-blue-100 text-forvis-blue-700'
                    }`}
                  >
                    {approvalsData.totalCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('notifications')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeSubTab === 'notifications'
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-100'
                }`}
                style={
                  activeSubTab === 'notifications'
                    ? { background: GRADIENTS.icon.standard }
                    : {}
                }
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </button>
            </nav>

            {/* Archive Selector - Only visible on Approvals tab */}
            {activeSubTab === 'approvals' && (
              <button
                onClick={() => {
                  setShowArchived(!showArchived);
                  setActiveApprovalType('all'); // Reset to 'all' when switching
                }}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  showArchived
                    ? 'text-white shadow-sm'
                    : 'text-forvis-gray-700 hover:bg-forvis-gray-100 border border-forvis-gray-300'
                }`}
                style={
                  showArchived
                    ? { background: GRADIENTS.icon.standard }
                    : {}
                }
              >
                <Archive className="h-4 w-4" />
                <span>{showArchived ? 'View Active' : 'View Archive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeSubTab === 'approvals' && (
            <div className="space-y-6">
              {isLoadingApprovals ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !approvalsData || approvalsData.totalCount === 0 ? (
                <div className="text-center py-12">
                  {showArchived ? (
                    <Archive className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  ) : (
                    <ClipboardCheck className="mx-auto h-12 w-12 text-forvis-gray-400" />
                  )}
                  <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                    {showArchived ? 'No Archived Approvals' : 'No Pending Approvals'}
                  </h3>
                  <p className="mt-1 text-sm text-forvis-gray-500">
                    {showArchived
                      ? "You don't have any archived approvals to view."
                      : "You don't have any items requiring approval at the moment."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Approval Type Tabs */}
                  <div className="border-b border-forvis-gray-200">
                    <nav className="flex flex-wrap gap-2 -mb-px">
                      <button
                        onClick={() => setActiveApprovalType('all')}
                        disabled={approvalsData.totalCount === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'all'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : approvalsData.totalCount === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'all'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>All</span>
                        {approvalsData.totalCount > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'all'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.totalCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('changeRequests')}
                        disabled={approvalsData.changeRequests.length === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'changeRequests'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : approvalsData.changeRequests.length === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'changeRequests'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>Change Requests</span>
                        {approvalsData.changeRequests.length > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'changeRequests'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.changeRequests.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('clientAcceptance')}
                        disabled={clientAcceptanceApprovals.length === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'clientAcceptance'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : clientAcceptanceApprovals.length === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'clientAcceptance'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>Client Acceptance</span>
                        {clientAcceptanceApprovals.length > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'clientAcceptance'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {clientAcceptanceApprovals.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('engagementAcceptance')}
                        disabled={approvalsData.engagementAcceptances.length === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'engagementAcceptance'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : approvalsData.engagementAcceptances.length === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'engagementAcceptance'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>Engagement Acceptance</span>
                        {approvalsData.engagementAcceptances && approvalsData.engagementAcceptances.length > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'engagementAcceptance'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.engagementAcceptances.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('reviewNotes')}
                        disabled={approvalsData.reviewNotes.length === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'reviewNotes'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : approvalsData.reviewNotes.length === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'reviewNotes'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>Review Notes</span>
                        {approvalsData.reviewNotes.length > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'reviewNotes'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.reviewNotes.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('independenceConfirmations')}
                        disabled={(approvalsData.independenceConfirmations?.length || 0) === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'independenceConfirmations'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : (approvalsData.independenceConfirmations?.length || 0) === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'independenceConfirmations'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Independence</span>
                        {(approvalsData.independenceConfirmations?.length || 0) > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'independenceConfirmations'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.independenceConfirmations.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveApprovalType('vaultDocuments')}
                        disabled={(approvalsData.centralizedApprovals?.length || 0) === 0}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                          activeApprovalType === 'vaultDocuments'
                            ? 'border-forvis-blue-500 text-white shadow-sm'
                            : (approvalsData.centralizedApprovals?.length || 0) === 0
                            ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                            : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                        }`}
                        style={
                          activeApprovalType === 'vaultDocuments'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        <span>Vault Documents</span>
                        {(approvalsData.centralizedApprovals?.length || 0) > 0 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              activeApprovalType === 'vaultDocuments'
                                ? 'bg-white/30 text-white'
                                : 'bg-forvis-blue-100 text-forvis-blue-700'
                            }`}
                          >
                            {approvalsData.centralizedApprovals?.length || 0}
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>

                  {/* Approval Items Based on Active Tab */}
                  <div className="space-y-3">
                    {/* Change Requests */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'changeRequests') &&
                      approvalsData.changeRequests.length > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Client Partner/Manager Changes ({approvalsData.changeRequests.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {approvalsData.changeRequests.map((request) => (
                              <ChangeRequestApprovalItem
                                key={request.id}
                                request={request}
                                onOpenModal={setModalRequestId}
                                showArchived={showArchived}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Client Acceptances */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'clientAcceptance') &&
                      clientAcceptanceApprovals.length > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Client Acceptance Approvals ({clientAcceptanceApprovals.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {clientAcceptanceApprovals.map((approval) => (
                              <ClientAcceptanceApprovalItem
                                key={approval.id}
                                approval={approval}
                                onApprove={async (stepId, comment) => {
                                  await approveStep.mutateAsync({ stepId, comment });
                                  await refetch();
                                }}
                                onReject={async (stepId, comment) => {
                                  await rejectStep.mutateAsync({ stepId, comment });
                                  refetch();
                                }}
                                isProcessing={approveStep.isPending || rejectStep.isPending}
                                showArchived={showArchived}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Engagement Acceptances */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'engagementAcceptance') &&
                      approvalsData.engagementAcceptances && approvalsData.engagementAcceptances.length > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Engagement Acceptance Approvals ({approvalsData.engagementAcceptances.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {approvalsData.engagementAcceptances.map((acceptance) => (
                              <EngagementAcceptanceApprovalItem
                                key={acceptance.taskId}
                                acceptance={acceptance}
                                onOpenTaskModal={handleOpenTaskModal}
                                showArchived={showArchived}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Review Notes */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'reviewNotes') &&
                      approvalsData.reviewNotes.length > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Review Notes Requiring Action ({approvalsData.reviewNotes.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {approvalsData.reviewNotes.map((note) => (
                              <ReviewNoteApprovalItem 
                                key={note.id} 
                                note={note} 
                                onOpenTaskModal={handleOpenTaskModal}
                                showArchived={showArchived} 
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Independence Confirmations */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'independenceConfirmations') &&
                      (approvalsData.independenceConfirmations?.length || 0) > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Independence Confirmations ({approvalsData.independenceConfirmations.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {approvalsData.independenceConfirmations.map((confirmation) => (
                              <IndependenceConfirmationItem
                                key={confirmation.id}
                                confirmation={confirmation}
                                onOpenTaskModal={handleOpenTaskModal}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Centralized Approvals (Vault Documents, etc.) */}
                    {(activeApprovalType === 'all' || activeApprovalType === 'vaultDocuments') &&
                      otherCentralizedApprovals.length > 0 && (
                        <div>
                          {activeApprovalType === 'all' && (
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Document Vault Approvals ({otherCentralizedApprovals.length})
                            </h3>
                          )}
                          <div className="space-y-3">
                            {otherCentralizedApprovals.map((approval) => (
                              <UnifiedApprovalCard
                                key={approval.id}
                                approval={approval}
                                onApprove={async (stepId, comment) => {
                                  await approveStep.mutateAsync({ stepId, comment });
                                  refetch();
                                }}
                                onReject={async (stepId, comment) => {
                                  await rejectStep.mutateAsync({ stepId, comment });
                                  refetch();
                                }}
                                isProcessing={approveStep.isPending || rejectStep.isPending}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Empty State for Specific Tab */}
                    {activeApprovalType !== 'all' &&
                      ((activeApprovalType === 'changeRequests' && approvalsData.changeRequests.length === 0) ||
                        (activeApprovalType === 'clientAcceptance' && clientAcceptanceApprovals.length === 0) ||
                        (activeApprovalType === 'engagementAcceptance' && (!approvalsData.engagementAcceptances || approvalsData.engagementAcceptances.length === 0)) ||
                        (activeApprovalType === 'independenceConfirmations' && (approvalsData.independenceConfirmations?.length || 0) === 0) ||
                        (activeApprovalType === 'reviewNotes' && approvalsData.reviewNotes.length === 0) ||
                        (activeApprovalType === 'vaultDocuments' && otherCentralizedApprovals.length === 0)) && (
                        <div className="text-center py-12">
                          {showArchived ? (
                            <Archive className="mx-auto h-12 w-12 text-forvis-gray-400" />
                          ) : (
                            <ClipboardCheck className="mx-auto h-12 w-12 text-forvis-gray-400" />
                          )}
                          <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                            No Items in This Category
                          </h3>
                          <p className="mt-1 text-sm text-forvis-gray-500">
                            {showArchived
                              ? 'There are no archived items in this approval category.'
                              : 'There are no pending items in this approval category.'}
                          </p>
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSubTab === 'notifications' && (
            <div className="space-y-6">
              {/* Read/Unread Filter Toggle - Always visible */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setNotificationReadFilter('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          notificationReadFilter === 'all'
                            ? 'text-white shadow-sm'
                            : 'text-forvis-gray-700 hover:bg-forvis-gray-100'
                        }`}
                        style={
                          notificationReadFilter === 'all'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        All
                      </button>
                      <button
                        onClick={() => setNotificationReadFilter('unread')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          notificationReadFilter === 'unread'
                            ? 'text-white shadow-sm'
                            : 'text-forvis-gray-700 hover:bg-forvis-gray-100'
                        }`}
                        style={
                          notificationReadFilter === 'unread'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        Unread Only
                      </button>
                      <button
                        onClick={() => setNotificationReadFilter('read')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          notificationReadFilter === 'read'
                            ? 'text-white shadow-sm'
                            : 'text-forvis-gray-700 hover:bg-forvis-gray-100'
                        }`}
                        style={
                          notificationReadFilter === 'read'
                            ? { background: GRADIENTS.icon.standard }
                            : {}
                        }
                      >
                        Read Only
                      </button>
                    </div>
                  </div>

                  {/* Notification Type Tabs - Always visible */}
                  <div className="border-b border-forvis-gray-200">
                    <nav className="flex flex-wrap gap-2 -mb-px">
                      {Object.entries(NOTIFICATION_CATEGORIES).map(([categoryKey, config]) => {
                        const category = categoryKey as NotificationCategory;
                        const count = notificationCategoryCounts[category];
                        
                        return (
                          <button
                            key={category}
                            onClick={() => {
                              setActiveNotificationType(category);
                              setNotificationPage(1); // Reset to first page
                            }}
                            disabled={count === 0}
                            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                              activeNotificationType === category
                                ? 'border-forvis-blue-500 text-white shadow-sm'
                                : count === 0
                                ? 'border-transparent text-forvis-gray-400 cursor-not-allowed'
                                : 'border-transparent text-forvis-gray-700 hover:text-forvis-gray-900 hover:border-forvis-gray-300'
                            }`}
                            style={
                              activeNotificationType === category
                                ? { background: GRADIENTS.icon.standard }
                                : {}
                            }
                          >
                            <span>{config.label}</span>
                            {count > 0 && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  activeNotificationType === category
                                    ? 'bg-white/30 text-white'
                                    : 'bg-forvis-blue-100 text-forvis-blue-700'
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Loading State */}
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : !notificationsData || notificationsData.notifications.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12">
                      <Bell className="mx-auto h-12 w-12 text-forvis-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No Notifications</h3>
                      <p className="mt-1 text-sm text-forvis-gray-500">
                        {notificationReadFilter === 'unread' 
                          ? "You don't have any unread notifications."
                          : notificationReadFilter === 'read'
                          ? "You don't have any read notifications."
                          : "You don't have any notifications at the moment."}
                      </p>
                    </div>
                  ) : (
                    /* Notification Items */
                    <div className="space-y-3">
                    {activeNotificationType === 'all' && groupedNotifications ? (
                      <>
                        {/* User Changes Section */}
                        {groupedNotifications.userChanges.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              User Changes ({groupedNotifications.userChanges.length})
                            </h3>
                            <div className="space-y-2">
                              {groupedNotifications.userChanges.map((notification) => (
                                <NotificationItem
                                  key={notification.id}
                                  notification={notification}
                                  onOpenChangeRequestModal={setModalRequestId}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Messages Section */}
                        {groupedNotifications.messages.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Messages ({groupedNotifications.messages.length})
                            </h3>
                            <div className="space-y-2">
                              {groupedNotifications.messages.map((notification) => (
                                <NotificationItem
                                  key={notification.id}
                                  notification={notification}
                                  onOpenChangeRequestModal={setModalRequestId}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Documents & Tasks Section */}
                        {groupedNotifications.documentsAndTasks.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-forvis-gray-900 uppercase tracking-wider mb-3">
                              Documents & Tasks ({groupedNotifications.documentsAndTasks.length})
                            </h3>
                            <div className="space-y-2">
                              {groupedNotifications.documentsAndTasks.map((notification) => (
                                <NotificationItem
                                  key={notification.id}
                                  notification={notification}
                                  onOpenChangeRequestModal={setModalRequestId}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        {notificationsData.notifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onOpenChangeRequestModal={setModalRequestId}
                          />
                        ))}
                      </div>
                    )}

                    {/* Empty State for Specific Tab */}
                    {activeNotificationType !== 'all' && 
                      notificationCategoryCounts[activeNotificationType] === 0 && (
                        <div className="text-center py-12">
                          <Bell className="mx-auto h-12 w-12 text-forvis-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">
                            No Notifications in This Category
                          </h3>
                          <p className="mt-1 text-sm text-forvis-gray-500">
                            {notificationReadFilter === 'unread' 
                              ? "You don't have any unread notifications in this category."
                              : notificationReadFilter === 'read'
                              ? "You don't have any read notifications in this category."
                              : "You don't have any notifications in this category."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pagination */}
                  {!isLoadingNotifications && notificationsData && totalNotificationPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-forvis-gray-200">
                      <div className="text-sm text-forvis-gray-600">
                        Page {notificationPage} of {totalNotificationPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setNotificationPage((p) => Math.max(1, p - 1))}
                          disabled={notificationPage === 1}
                          className="px-3 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setNotificationPage((p) => Math.min(totalNotificationPages, p + 1))
                          }
                          disabled={notificationPage === totalNotificationPages}
                          className="px-3 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
            </div>
          )}
        </div>
      </div>

      {/* Change Request Modal */}
      {modalRequestId && (
        <ApproveChangeRequestModal
          isOpen={modalRequestId !== null}
          onClose={() => setModalRequestId(null)}
          requestId={modalRequestId}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={selectedTask !== null}
          taskId={selectedTask.taskId}
          onClose={handleCloseTaskModal}
          serviceLine={selectedTask.serviceLine}
          subServiceLineGroup={selectedTask.subServiceLineGroup}
          clientId={selectedTask.clientId}
          initialNoteId={selectedTask.noteId}
          initialTab={selectedTask.initialTab}
        />
      )}
    </div>
  );
}
