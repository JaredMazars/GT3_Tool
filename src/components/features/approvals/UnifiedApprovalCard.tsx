'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Eye, Download, FileText } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { formatDate } from '@/lib/utils/taskUtils';
import { GRADIENTS } from '@/lib/design-system/gradients';
import type { ApprovalWithSteps, WorkflowType } from '@/types/approval';
import { getWorkflowRegistry, getWorkflowDisplayTitle, getWorkflowDisplayDescription } from '@/lib/services/approvals/workflowRegistry';
import { useDownloadApprovalDocument } from '@/hooks/documentVault/useDocuments';
import { DocumentPreviewModal } from '@/components/features/document-vault/DocumentPreviewModal';
import { WorkflowTimeline } from './WorkflowTimeline';
import { EditDocumentModal } from '@/components/features/document-vault/EditDocumentModal';

interface UnifiedApprovalCardProps {
  approval: ApprovalWithSteps;
  onApprove?: (stepId: number, comment?: string) => Promise<void>;
  onReject?: (stepId: number, comment: string) => Promise<void>;
  isProcessing?: boolean;
}

export function UnifiedApprovalCard({
  approval,
  onApprove,
  onReject,
  isProcessing = false,
}: UnifiedApprovalCardProps) {
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const workflowType = approval.workflowType as WorkflowType;
  const registry = getWorkflowRegistry(workflowType);
  const IconComponent = registry.icon;

  // Get current pending step
  const currentStep = approval.ApprovalStep.find((s) => s.status === 'PENDING');
  const totalSteps = approval.ApprovalStep.length;
  const completedSteps = approval.ApprovalStep.filter((s) => s.status === 'APPROVED').length;

  // For vault documents, fetch download URL
  const isVaultDocument = workflowType === 'VAULT_DOCUMENT';
  const {
    data: downloadData,
    isLoading: isLoadingDownload,
    error: downloadError,
  } = useDownloadApprovalDocument(isVaultDocument ? approval.workflowId : 0);

  // Fetch workflow-specific data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        const response = await fetch(`/api/approvals/${approval.id}/workflow`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch workflow data: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          setWorkflowData(result.data);
        } else {
          console.error('Error loading workflow data:', result.error);
        }
      } catch (error) {
        console.error('Error loading workflow data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [approval.id]);

  // Fetch categories when details modal opens for vault documents
  useEffect(() => {
    if (isVaultDocument && showDetailsModal) {
      fetch('/api/document-vault/categories')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCategories(data.data);
          }
        })
        .catch(err => console.error('Failed to load categories:', err));
    }
  }, [isVaultDocument, showDetailsModal]);

  const handleApprove = async () => {
    if (!currentStep || !onApprove) return;
    
    try {
      setIsSubmitting(true);
      await onApprove(currentStep.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentStep || !onReject || !rejectComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onReject(currentStep.id, rejectComment);
      setShowRejectModal(false);
      setRejectComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayTitle = workflowData
    ? getWorkflowDisplayTitle(workflowType, workflowData)
    : approval.title;
  const displayDescription = workflowData
    ? getWorkflowDisplayDescription(workflowType, workflowData)
    : approval.description;

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  const handleDownload = () => {
    if (downloadData?.downloadUrl) {
      window.open(downloadData.downloadUrl, '_blank');
    }
  };

  // Determine if preview is supported
  const canPreview =
    downloadData?.mimeType === 'application/pdf' ||
    downloadData?.mimeType?.startsWith('image/');

  return (
    <div
      className="rounded-lg border border-forvis-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-200"
      style={{ background: GRADIENTS.dashboard.card }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
          >
            <IconComponent className="h-5 w-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-forvis-gray-900">
                    {isLoadingData ? 'Loading...' : displayTitle}
                  </h4>
                  {approval.priority !== 'MEDIUM' && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        approval.priority === 'URGENT' || approval.priority === 'HIGH'
                          ? 'bg-forvis-error-100 text-forvis-error-800'
                          : 'bg-forvis-gray-100 text-forvis-gray-800'
                      }`}
                    >
                      {approval.priority}
                    </span>
                  )}
                </div>
                {displayDescription && (
                  <p className="text-xs text-forvis-gray-600">{displayDescription}</p>
                )}
              </div>
            </div>

            {/* View Document Buttons (Vault Documents Only) */}
            {isVaultDocument && (
              <div className="mb-3">
                {isLoadingDownload ? (
                  <div className="flex items-center space-x-2 text-xs text-forvis-gray-600">
                    <LoadingSpinner size="sm" />
                    <span>Loading document...</span>
                  </div>
                ) : downloadError ? (
                  <div className="text-xs text-forvis-error-600">
                    Failed to load document preview
                  </div>
                ) : downloadData ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDetailsModal(true)}
                      className="text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    {canPreview && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handlePreview}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                      className="text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Progress Indicator */}
            {totalSteps > 1 && (
              <div className="mb-3">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-forvis-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(completedSteps / totalSteps) * 100}%`,
                        background: GRADIENTS.primary.horizontal,
                      }}
                    />
                  </div>
                  <span className="text-xs text-forvis-gray-600 whitespace-nowrap">
                    Step {completedSteps + 1} of {totalSteps}
                  </span>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-forvis-gray-600">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Requested by {approval.User_Approval_requestedByIdToUser.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(approval.requestedAt.toString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {currentStep && (onApprove || onReject) && (
          <div className="ml-4 flex space-x-2">
            {onApprove && (
              <Button
                variant="gradient"
                size="sm"
                onClick={handleApprove}
                disabled={isProcessing || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-1">Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>
            )}
            {onReject && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing || isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Workflow Timeline for Vault Documents */}
      {isVaultDocument && (
        <WorkflowTimeline 
          type="vaultDocument" 
          vaultDocument={{
            requestedByName: approval.User_Approval_requestedByIdToUser.name || 'Unknown',
            requestedAt: approval.requestedAt,
            ApprovalStep: approval.ApprovalStep.map(step => ({
              stepOrder: step.stepOrder,
              status: step.status,
              approvedAt: step.approvedAt,
              User_ApprovalStep_assignedToUserIdToUser: null
            }))
          }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Reject Approval</h3>
            <p className="text-sm text-forvis-gray-700 mb-4">
              Please provide a reason for rejecting this approval:
            </p>
            <textarea
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
              rows={4}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReject}
                disabled={!rejectComment.trim() || isSubmitting}
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && downloadData && (
        <DocumentPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          downloadUrl={downloadData.downloadUrl}
          fileName={downloadData.fileName}
          mimeType={downloadData.mimeType}
          onDownload={handleDownload}
        />
      )}

      {/* Document Details Modal */}
      {showDetailsModal && isVaultDocument && workflowData && (
        <EditDocumentModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          document={workflowData}
          categories={categories}
          serviceLines={['TAX', 'AUDIT', 'ACCOUNTING', 'ADVISORY', 'QRM', 'BUSINESS_DEV', 'IT', 'FINANCE', 'HR', 'COUNTRY_MANAGEMENT']}
          onSuccess={() => {
            // Reload workflow data after successful update
            const loadData = async () => {
              try {
                const response = await fetch(`/api/approvals/${approval.id}/workflow`);
                if (response.ok) {
                  const result = await response.json();
                  if (result.success) {
                    setWorkflowData(result.data);
                  }
                }
              } catch (error) {
                console.error('Error reloading workflow data:', error);
              }
            };
            loadData();
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
}
