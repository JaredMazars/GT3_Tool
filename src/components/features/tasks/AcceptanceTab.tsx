'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Play, FileCheck } from 'lucide-react';
import { Task } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/tasks/useTaskData';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';
import { useQuestionnaireStatus } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { AcceptanceQuestionnaire } from './acceptance/AcceptanceQuestionnaire';
import { AcceptanceReview } from './acceptance/AcceptanceReview';

interface AcceptanceTabProps {
  task: Task;
  currentUserRole: string;
  onApprovalComplete: () => void;
}

export function AcceptanceTab({ task, currentUserRole, onApprovalComplete }: AcceptanceTabProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'questionnaire' | 'review' | null>(null);
  const queryClient = useQueryClient();

  // Get valid task ID - return early if invalid
  const taskId = task?.id?.toString();
  
  // Clear any invalid cached queries on mount
  useEffect(() => {
    // Remove any queries with empty or undefined taskIds
    queryClient.removeQueries({ queryKey: ['acceptance', 'status', ''] });
    queryClient.removeQueries({ queryKey: ['acceptance', 'status', 'undefined'] });
    queryClient.removeQueries({ queryKey: ['acceptance', 'questionnaire', ''] });
    queryClient.removeQueries({ queryKey: ['acceptance', 'questionnaire', 'undefined'] });
  }, [queryClient]);
  
  // Debug: Log task to see what we're getting
  useEffect(() => {
    console.log('AcceptanceTab render:', {
      hasTask: !!task,
      taskId: task?.id,
      taskIdString: taskId,
      taskIdType: typeof task?.id,
    });
  }, [task, taskId]);

  // Check if user can approve acceptance (Partners and System Admins only)
  const { data: canApprove = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(task);

  // Get questionnaire status - pass empty string if no taskId (hook will disable itself)
  const { data: statusData, isLoading: isLoadingStatus, isFetching, error: statusError } = useQuestionnaireStatus(taskId ?? '');
  const status = statusData?.data;

  // Debug: Log query states
  useEffect(() => {
    console.log('Query states:', {
      taskId: taskId ?? 'NO_TASK_ID',
      isLoadingStatus,
      isCheckingPermission,
      hasStatusData: !!statusData,
      statusError: statusError?.message,
      canApprove,
    });
  }, [taskId, isLoadingStatus, isCheckingPermission, statusData, statusError, canApprove]);

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
          queryKey: taskKeys.detail(task.id.toString()) 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'status', task.id.toString()] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'questionnaire', task.id.toString()] 
        }),
      ]);
      
      // Wait for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onApprovalComplete();
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

  // Only show loading if task doesn't exist
  if (!task) {
    console.log('No task - showing loading');
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
      </div>
    );
  }

  console.log('Rendering AcceptanceTab content');

  return (
    <div className="p-6 bg-forvis-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">
                Client Acceptance and Continuance
              </h2>
              <p className="text-sm text-forvis-gray-600">
                Complete the questionnaire to assess client risk and compliance with professional standards.
              </p>
            </div>
            
            {isLoadingStatus ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forvis-blue-500"></div>
                <span className="text-sm font-semibold text-forvis-gray-700">Loading...</span>
              </div>
            ) : isApproved ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Approved</span>
              </div>
            ) : status?.completed ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Submitted</span>
              </div>
            ) : status?.exists ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">In Progress ({status?.completionPercentage || 0}%)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
                <Play className="h-5 w-5 text-forvis-gray-600" />
                <span className="text-sm font-semibold text-forvis-gray-700">Not Started</span>
              </div>
            )}
          </div>
        </div>

        {/* Client Information (collapsed when working on questionnaire) */}
        {(workflowState === 'not_started' || workflowState === 'approved') && (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
            <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
              <h3 className="text-lg font-semibold text-forvis-gray-900">Client Information</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Client Name</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {task.client?.clientNameFull || task.client?.clientCode || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Client Code</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {task.client?.clientCode || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Partner</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {task.client?.clientPartner || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Manager</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {task.client?.clientManager || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Workflow State Content */}
        {workflowState === 'not_started' && viewMode !== 'questionnaire' && (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-3">
              Begin Client Acceptance and Continuance
            </h3>
            <p className="text-sm text-forvis-gray-700 mb-6">
              No acceptance questionnaire has been created for this engagement yet. Click below to begin the assessment process.
              The system will automatically determine whether to use the full or lite questionnaire based on client characteristics.
            </p>
            <button
              onClick={() => setViewMode('questionnaire')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
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
                        {status?.riskRating && (
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
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
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
            <div className="bg-green-50 rounded-lg border-2 border-green-200 shadow-corporate overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Acceptance Approved
                    </h3>
                    <dl className="space-y-2">
                      {task.acceptanceApprovedAt && (
                        <div>
                          <dt className="text-sm font-medium text-green-800 inline">Approved on: </dt>
                          <dd className="text-sm text-green-700 inline">
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
                          <dt className="text-sm font-medium text-green-800 inline">Approved by: </dt>
                          <dd className="text-sm text-green-700 inline">
                            {task.acceptanceApprovedBy}
                          </dd>
                        </div>
                      )}
                      {status?.riskRating && (
                        <div>
                          <dt className="text-sm font-medium text-green-800 inline">Final Risk Rating: </dt>
                          <dd className="text-sm text-green-700 inline">
                            {status.riskRating} ({status.overallRiskScore}%)
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-sm text-green-700 mt-3">
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
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
