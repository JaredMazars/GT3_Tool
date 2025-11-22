'use client';

import { useState } from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/hooks/projects/useProjectData';
import { useCanApproveAcceptance } from '@/hooks/auth/usePermissions';

interface AcceptanceTabProps {
  project: Project;
  currentUserRole: string;
  onApprovalComplete: () => void;
}

export function AcceptanceTab({ project, currentUserRole, onApprovalComplete }: AcceptanceTabProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if user can approve acceptance (Partners and Superusers only)
  const { data: canApprove = false, isLoading: isCheckingPermission } = useCanApproveAcceptance(project);

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

      // Invalidate and refetch the project data
      await queryClient.invalidateQueries({ 
        queryKey: projectKeys.detail(project.id.toString()) 
      });
      
      onApprovalComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve acceptance');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="p-6 bg-forvis-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">
                Client Acceptance and Continuance
              </h2>
              <p className="text-sm text-forvis-gray-600">
                Review client information and confirm acceptance before proceeding with the engagement.
              </p>
            </div>
            
            {isApproved ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Approved</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Client Information */}
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
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Industry</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">
                  {project.client?.forvisMazarsIndustry || project.client?.industry || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Sector</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">
                  {project.client?.forvisMazarsSector || project.client?.sector || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Project Information */}
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
          <div className="px-6 py-4 border-b border-forvis-gray-200 bg-forvis-gray-50">
            <h3 className="text-lg font-semibold text-forvis-gray-900">Project Details</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Project Name</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-forvis-gray-600">Project Type</dt>
                <dd className="mt-1 text-sm text-forvis-gray-900">
                  {project.projectType.replace(/_/g, ' ')}
                </dd>
              </div>
              {project.taxYear && (
                <div>
                  <dt className="text-sm font-medium text-forvis-gray-600">Tax Year</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{project.taxYear}</dd>
                </div>
              )}
              {project.description && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-forvis-gray-600">Description</dt>
                  <dd className="mt-1 text-sm text-forvis-gray-900">{project.description}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Approval Status */}
        {isApproved ? (
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
                  </dl>
                  <p className="text-sm text-green-700 mt-3">
                    You can now proceed to generate and upload the engagement letter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-3">
                Approval Required
              </h3>
              <p className="text-sm text-forvis-gray-700 mb-4">
                Please review the client and project information above. Once you confirm that all details
                are correct and the client acceptance process is complete, click the button below to approve.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {isCheckingPermission ? (
                <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Checking permissions...</p>
                </div>
              ) : canApprove && !isApproved ? (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all shadow-corporate hover:shadow-corporate-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {isApproving ? 'Approving...' : 'Approve Client Acceptance'}
                </button>
              ) : !isApproved ? (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Only Partners and System Administrators can approve client acceptance.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


