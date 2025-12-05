'use client';

import { useState } from 'react';
import { CheckCircleIcon, ClockIcon, PlayIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';
import { Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/tasks/useTaskData';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';
import { useQuestionnaireStatus } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { AcceptanceQuestionnaire } from './acceptance/AcceptanceQuestionnaire';
import { AcceptanceReview } from './acceptance/AcceptanceReview';

interface AcceptanceTabProps {
  project: Project;
  currentUserRole: string;
  onApprovalComplete: () => void;
}

export function AcceptanceTab({ project, currentUserRole, onApprovalComplete }: AcceptanceTabProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'questionnaire' | 'review'>('questionnaire');
  const queryClient = useQueryClient();

  // Check if user can approve acceptance (Partners and System Admins only)
  const { data: canApprove = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(project);

  // Get questionnaire status
  const { data: statusData, isLoading: isLoadingStatus } = useQuestionnaireStatus(project.id.toString());
  const status = statusData?.data;

  const isApproved = project.acceptanceApproved;

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/acceptance`, {
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
          queryKey: taskKeys.detail(project.id.toString()) 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'status', project.id.toString()] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['acceptance', 'questionnaire', project.id.toString()] 
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
    // Refetch status after submission
    queryClient.invalidateQueries({ 
      queryKey: ['acceptance', 'status', project.id.toString()] 
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

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
      </div>
    );
  }

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
            
            {isApproved ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Approved</span>
              </div>
            ) : status?.completed ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <DocumentCheckIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Submitted</span>
              </div>
            ) : status?.exists ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">In Progress ({status?.completionPercentage || 0}%)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-forvis-gray-100 border-2 border-forvis-gray-300 rounded-lg">
                <PlayIcon className="h-5 w-5 text-forvis-gray-600" />
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
                    {project.client?.clientNameFull || project.client?.clientCode || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Client Code</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {project.client?.clientCode || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Partner</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {project.client?.clientPartner || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Manager</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">
                    {project.client?.clientManager || 'N/A'}
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
              Begin Acceptance Questionnaire
            </h3>
            <p className="text-sm text-forvis-gray-700 mb-6">
              The system will automatically determine whether to use the full or lite questionnaire based on client characteristics.
            </p>
            <button
              onClick={() => setViewMode('questionnaire')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <PlayIcon className="h-5 w-5" />
              Start Questionnaire
            </button>
          </div>
        )}

        {(workflowState === 'in_progress' || (viewMode === 'questionnaire' && workflowState === 'not_started')) && (
          <AcceptanceQuestionnaire 
            taskId={project.id.toString()} 
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}

        {workflowState === 'submitted' && (
          <>
            {canApprove && viewMode === 'review' ? (
              <AcceptanceReview
                taskId={project.id.toString()}
                onApprove={handleApprove}
                canApprove={canApprove}
                isApproving={isApproving}
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg border-2 border-blue-200 shadow-corporate p-6">
                  <div className="flex items-start">
                    <DocumentCheckIcon className="h-6 w-6 text-blue-600 mt-1 mr-3" />
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
                    <DocumentCheckIcon className="h-4 w-4" />
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
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mt-1 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Acceptance Approved
                    </h3>
                    <dl className="space-y-2">
                      {project.acceptanceApprovedAt && (
                        <div>
                          <dt className="text-sm font-medium text-green-800 inline">Approved on: </dt>
                          <dd className="text-sm text-green-700 inline">
                            {new Date(project.acceptanceApprovedAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </dd>
                        </div>
                      )}
                      {project.acceptanceApprovedBy && (
                        <div>
                          <dt className="text-sm font-medium text-green-800 inline">Approved by: </dt>
                          <dd className="text-sm text-green-700 inline">
                            {project.acceptanceApprovedBy}
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
              taskId={project.id.toString()}
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
