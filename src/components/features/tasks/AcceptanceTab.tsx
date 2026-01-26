'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Play, FileCheck } from 'lucide-react';
import { Task } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/tasks/useTaskData';
import { taskListKeys } from '@/hooks/tasks/useTasks';
import { kanbanKeys } from '@/hooks/tasks/useKanbanBoard';
import { clientKeys } from '@/hooks/clients/useClients';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';
import { useQuestionnaire, deriveQuestionnaireStatus } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { useClientAcceptanceStatus } from '@/hooks/acceptance/useClientAcceptanceStatus';
import { Banner } from '@/components/ui';
import { AcceptanceQuestionnaire } from './acceptance/AcceptanceQuestionnaire';
import { AcceptanceReview } from './acceptance/AcceptanceReview';
import { AcceptanceTabSkeleton } from './acceptance/AcceptanceTabSkeleton';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface AcceptanceTabProps {
  task: Task;
  currentUserRole: string;
  onApprovalComplete: () => void;
  onNavigateToEngagementLetter?: () => void;
}

export function AcceptanceTab({ task, currentUserRole, onApprovalComplete, onNavigateToEngagementLetter }: AcceptanceTabProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'questionnaire' | 'review' | null>(null);
  const queryClient = useQueryClient();

  // Get valid task ID
  const taskId = task?.id?.toString();
  
  // Check if user can approve acceptance (Partners and System Admins only)
  const { data: canApprove = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(task);

  // Single query for all acceptance data - no separate status query needed
  const { data: questionnaireData, isLoading: isLoadingQuestionnaire } = useQuestionnaire(taskId ?? '');
  
  // Derive status from questionnaire data
  const status = deriveQuestionnaireStatus(questionnaireData);
  
  // Fetch client acceptance status if this is a client task
  const { data: clientAcceptanceStatus, isLoading: isLoadingClientAcceptance } = useClientAcceptanceStatus(task?.GSClientID);
  
  const isApproved = task?.acceptanceApproved;

  const handleApprove = async () => {
    if (!task) return;
    
    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve acceptance');
      }

      // Invalidate all related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: taskKeys.detail(task.id.toString()),
          refetchType: 'active' // Force immediate refetch
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'status', task.id.toString()] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'questionnaire', task.id.toString()] 
        }),
        // Invalidate task list queries (workspace list view)
        queryClient.invalidateQueries({ 
          queryKey: taskListKeys.lists() 
        }),
        // Invalidate kanban board queries (kanban view) - FORCE REFETCH
        queryClient.invalidateQueries({ 
          queryKey: kanbanKeys.boards(),
          refetchType: 'active' // Force immediate refetch to update A&C icon
        }),
        // Invalidate client cache if this is a client task
        ...(task.GSClientID ? [
          queryClient.invalidateQueries({ 
            queryKey: clientKeys.all 
          })
        ] : []),
      ]);
      
      // Wait for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onApprovalComplete();
      
      // Navigate to engagement letter tab after successful approval
      if (onNavigateToEngagementLetter) {
        onNavigateToEngagementLetter();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve acceptance');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSubmitSuccess = () => {
    if (!task) return;
    
    // Refetch status after submission
    queryClient.invalidateQueries({ 
      queryKey: ['acceptance', 'status', task.id.toString()] 
    });
    setViewMode('review');
  };

  // Determine workflow state
  const workflowState: 'not_started' | 'in_progress' | 'submitted' | 'approved' = isApproved
    ? 'approved'
    : status?.completed
    ? 'submitted'
    : status?.exists
    ? 'in_progress'
    : 'not_started';

  // Auto-set view mode based on workflow state
  useEffect(() => {
    if (workflowState === 'in_progress' && viewMode !== 'questionnaire') {
      setViewMode('questionnaire');
    } else if (workflowState === 'submitted' && viewMode !== 'review') {
      setViewMode('review');
    }
  }, [workflowState, viewMode]);

  // Show skeleton while loading initial data
  if (!task || isLoadingQuestionnaire) {
    return <AcceptanceTabSkeleton />;
  }

  return (
    <div className="p-6 bg-forvis-gray-50 min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">
                Engagement Acceptance
              </h2>
              <p className="text-sm text-forvis-gray-600">
                Complete the questionnaire to assess engagement-specific risks and ensure team competency for this project.
              </p>
            </div>
            
            {isApproved ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-success-50 border-2 border-forvis-success-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-forvis-success-600" />
                <span className="text-sm font-semibold text-forvis-success-700">Approved</span>
              </div>
            ) : status.completed ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Submitted</span>
              </div>
            ) : status.exists ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-warning-50 border-2 border-forvis-warning-200 rounded-lg">
                <Clock className="h-5 w-5 text-forvis-warning-600" />
                <span className="text-sm font-semibold text-forvis-warning-700">In Progress ({status.completionPercentage || 0}%)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
                <Play className="h-5 w-5 text-forvis-gray-600" />
                <span className="text-sm font-semibold text-forvis-gray-700">Not Started</span>
              </div>
            )}
          </div>
        </div>

        {/* Workflow State Content */}
        {workflowState === 'not_started' && viewMode !== 'questionnaire' && (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-3">
              Begin Engagement Acceptance
            </h3>
            <p className="text-sm text-forvis-gray-700 mb-6">
              No engagement acceptance questionnaire has been created yet. Click below to begin the assessment process.
              The system will automatically determine whether to use the full or lite questionnaire based on engagement characteristics.
            </p>
            <p className="text-xs text-forvis-gray-600 mb-6 p-3 bg-blue-50 rounded border border-blue-200">
              <strong>Note:</strong> Client Acceptance must be completed before Engagement Acceptance. This focuses on engagement-specific risks and team competency.
            </p>
            
            {/* Client Acceptance Status Banner */}
            {task?.GSClientID && !isLoadingClientAcceptance && (
              <div className="mb-6">
                {!clientAcceptanceStatus?.exists && (
                  <Banner
                    variant="warning"
                    title="Client Acceptance Required"
                    message="Client Acceptance has not been started for this client. Please complete Client Acceptance before beginning Engagement Acceptance."
                  />
                )}
                {clientAcceptanceStatus?.exists && !clientAcceptanceStatus.completed && (
                  <Banner
                    variant="info"
                    title="Client Acceptance In Progress"
                    message="Client Acceptance is in progress. Complete and get approval before starting Engagement Acceptance."
                  />
                )}
                {clientAcceptanceStatus?.completed && !clientAcceptanceStatus.approved && (
                  <Banner
                    variant="info"
                    title="Pending Approval"
                    message="Client Acceptance has been submitted and is pending Partner approval."
                  />
                )}
                {clientAcceptanceStatus?.approved && clientAcceptanceStatus.validUntil && new Date(clientAcceptanceStatus.validUntil) < new Date() && (
                  <Banner
                    variant="warning"
                    title="Client Acceptance Expired"
                    message="Client Acceptance has expired and requires reassessment."
                  />
                )}
                {clientAcceptanceStatus?.approved && (!clientAcceptanceStatus.validUntil || new Date(clientAcceptanceStatus.validUntil) > new Date()) && (
                  <Banner
                    variant="success"
                    title="Client Acceptance Approved"
                    message={`Client Acceptance was approved on ${clientAcceptanceStatus.approvedAt ? new Date(clientAcceptanceStatus.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}. You may proceed with Engagement Acceptance.`}
                  />
                )}
              </div>
            )}
            
            <button
              onClick={() => setViewMode('questionnaire')}
              disabled={Boolean(task?.GSClientID && (!clientAcceptanceStatus?.approved || (clientAcceptanceStatus.validUntil && new Date(clientAcceptanceStatus.validUntil) < new Date())))}
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-lg shadow-lg transition-all ${
                task?.GSClientID && (!clientAcceptanceStatus?.approved || (clientAcceptanceStatus.validUntil && new Date(clientAcceptanceStatus.validUntil) < new Date()))
                  ? 'text-forvis-gray-400 bg-forvis-gray-200 cursor-not-allowed opacity-60'
                  : 'text-white hover:shadow-xl cursor-pointer'
              }`}
              style={
                task?.GSClientID && (!clientAcceptanceStatus?.approved || (clientAcceptanceStatus.validUntil && new Date(clientAcceptanceStatus.validUntil) < new Date()))
                  ? {}
                  : { background: GRADIENTS.icon.standard }
              }
            >
              <Play className="h-5 w-5" />
              Start Questionnaire
            </button>
          </div>
        )}

        {(workflowState === 'in_progress' || (viewMode === 'questionnaire' && workflowState === 'not_started')) && (
          <AcceptanceQuestionnaire 
            taskId={task.id.toString()} 
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}

        {workflowState === 'submitted' && (
          <>
            {canApprove && viewMode === 'review' ? (
              <AcceptanceReview
                taskId={task.id.toString()}
                onApprove={handleApprove}
                canApprove={canApprove}
                isApproving={isApproving}
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg border-2 border-blue-200 shadow-corporate p-6">
                  <div className="flex items-start">
                    <FileCheck className="h-6 w-6 text-blue-600 mt-1 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        Questionnaire Submitted
                      </h3>
                      <p className="text-sm text-blue-700">
                        Your questionnaire has been submitted for review by a Partner or System Administrator.
                        {status.riskRating && (
                          <span className="block mt-2 font-semibold">
                            Risk Rating: {status.riskRating} ({status.overallRiskScore}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {canApprove && (
                  <button
                    onClick={() => setViewMode('review')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
                    style={{ background: GRADIENTS.icon.standard }}
                  >
                    <FileCheck className="h-4 w-4" />
                    Review and Approve
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {workflowState === 'approved' && (
          <>
            <div className="bg-forvis-success-50 rounded-lg border-2 border-forvis-success-200 shadow-corporate overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-forvis-success-600 mt-1 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-forvis-success-900 mb-2">
                      Engagement Acceptance Approved
                    </h3>
                    <dl className="space-y-2">
                      {task.acceptanceApprovedAt && (
                        <div>
                          <dt className="text-sm font-medium text-forvis-success-800 inline">Approved on: </dt>
                          <dd className="text-sm text-forvis-success-700 inline">
                            {new Date(task.acceptanceApprovedAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </dd>
                        </div>
                      )}
                      {task.acceptanceApprovedBy && (
                        <div>
                          <dt className="text-sm font-medium text-forvis-success-800 inline">Approved by: </dt>
                          <dd className="text-sm text-forvis-success-700 inline">
                            {task.acceptanceApprovedBy}
                          </dd>
                        </div>
                      )}
                      {status.riskRating && (
                        <div>
                          <dt className="text-sm font-medium text-forvis-success-800 inline">Final Risk Rating: </dt>
                          <dd className="text-sm text-forvis-success-700 inline">
                            {status.riskRating} ({status.overallRiskScore}%)
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-sm text-forvis-success-700 mt-3">
                      You can now proceed to generate and upload the engagement letter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Show full review in read-only mode */}
            <AcceptanceReview
              taskId={task.id.toString()}
              onApprove={() => {}} // No-op, already approved
              canApprove={false} // Hide approve button
              isApproving={false}
              hideReviewedMessage={true} // Hide duplicate reviewed message
            />
          </>
        )}

        {error && (
          <div className="p-4 bg-forvis-error-50 border-2 border-forvis-error-200 rounded-lg">
            <p className="text-sm text-forvis-error-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
