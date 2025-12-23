/**
 * Review Note Detail Modal Component
 * Displays full review note information with actions
 */

'use client';

import { useState } from 'react';
import { X, ExternalLink, Loader2, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useReviewNote } from '../hooks/useReviewNotes';
import { useChangeReviewNoteStatus } from '../hooks/useReviewNoteActions';
import { useReviewNoteComments, useAddReviewNoteComment } from '../hooks/useReviewNoteComments';
import { ReviewNoteStatus, ReviewNotePriority } from '@/types/review-notes';

interface ReviewNoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  noteId: number;
  currentUserId?: string;
}

export function ReviewNoteDetailModal({
  isOpen,
  onClose,
  taskId,
  noteId,
  currentUserId,
}: ReviewNoteDetailModalProps) {
  const [newComment, setNewComment] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: note, isLoading } = useReviewNote({
    taskId,
    noteId,
    includeComments: true,
    includeAttachments: false,
  });

  const { data: comments = [] } = useReviewNoteComments(taskId, noteId);
  const addCommentMutation = useAddReviewNoteComment(taskId, noteId);
  const changeStatusMutation = useChangeReviewNoteStatus(taskId, noteId);

  if (!isOpen) return null;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        comment: newComment,
      });
      
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleStatusChange = async (status: ReviewNoteStatus, reason?: string) => {
    try {
      await changeStatusMutation.mutateAsync({
        status,
        reason,
      });
      
      if (status === 'CLEARED') setShowConfirmClear(false);
      if (status === 'REJECTED') setShowConfirmReject(false);
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const getPriorityColor = (priority: ReviewNotePriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: ReviewNoteStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ADDRESSED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CLEARED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="max-w-4xl w-full p-6 bg-white rounded-lg shadow-corporate-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-forvis-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="max-w-4xl w-full p-6 bg-white rounded-lg shadow-corporate-lg">
          <p className="text-center text-red-600">Failed to load review note</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-4xl w-full p-6 bg-white rounded-lg shadow-corporate-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-forvis-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-forvis-gray-900">{note.title}</h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(note.priority as ReviewNotePriority)}`}>
                {note.priority}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(note.status as ReviewNoteStatus)}`}>
                {note.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-forvis-gray-600 hover:text-forvis-gray-900 rounded-lg hover:bg-forvis-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-6">
          {/* Description */}
          {note.description && (
            <div>
              <h3 className="text-sm font-medium text-forvis-gray-700 mb-2">Description</h3>
              <p className="text-sm text-forvis-gray-600 whitespace-pre-wrap">{note.description}</p>
            </div>
          )}

          {/* Reference URL */}
          {note.referenceUrl && (
            <div>
              <h3 className="text-sm font-medium text-forvis-gray-700 mb-2">Reference</h3>
              <a
                href={note.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sm text-forvis-blue-600 hover:text-forvis-blue-800"
              >
                <span>{note.referenceUrl}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Raised By</h3>
              <p className="text-sm text-forvis-gray-900">
                {note.User_ReviewNote_raisedByToUser?.name || note.User_ReviewNote_raisedByToUser?.email || 'Unknown'}
              </p>
            </div>
            
            {note.User_ReviewNote_assignedToToUser && (
              <div>
                <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Assigned To</h3>
                <p className="text-sm text-forvis-gray-900">
                  {note.User_ReviewNote_assignedToToUser.name || note.User_ReviewNote_assignedToToUser.email}
                </p>
              </div>
            )}

            {note.dueDate && (
              <div>
                <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Due Date</h3>
                <p className="text-sm text-forvis-gray-900">
                  {new Date(note.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Created</h3>
              <p className="text-sm text-forvis-gray-900">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>

            {note.addressedAt && note.User_ReviewNote_addressedByToUser && (
              <>
                <div>
                  <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Addressed By</h3>
                  <p className="text-sm text-forvis-gray-900">
                    {note.User_ReviewNote_addressedByToUser.name || note.User_ReviewNote_addressedByToUser.email}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Addressed At</h3>
                  <p className="text-sm text-forvis-gray-900">
                    {new Date(note.addressedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}

            {note.clearedAt && note.User_ReviewNote_clearedByToUser && (
              <>
                <div>
                  <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Cleared By</h3>
                  <p className="text-sm text-forvis-gray-900">
                    {note.User_ReviewNote_clearedByToUser.name || note.User_ReviewNote_clearedByToUser.email}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-forvis-gray-500 uppercase mb-1">Cleared At</h3>
                  <p className="text-sm text-forvis-gray-900">
                    {new Date(note.clearedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-sm font-medium text-forvis-gray-700 mb-3 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Comments ({comments.length})</span>
            </h3>
            
            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-forvis-gray-500 italic">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-forvis-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-forvis-gray-900">
                        {comment.User?.name || comment.User?.email || 'Unknown'}
                      </span>
                      <span className="text-xs text-forvis-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-forvis-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm"
                rows={2}
                disabled={addCommentMutation.isPending}
              />
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  variant="primary"
                  size="md"
                  icon={addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-forvis-gray-200">
          <div className="flex space-x-2">
            {note.status === 'OPEN' && (
              <Button
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={changeStatusMutation.isPending}
                variant="primary"
                size="sm"
                icon={<AlertCircle className="w-4 h-4" />}
              >
                Start Progress
              </Button>
            )}

            {(note.status === 'OPEN' || note.status === 'IN_PROGRESS') && (
              <Button
                onClick={() => handleStatusChange('ADDRESSED')}
                disabled={changeStatusMutation.isPending}
                variant="primary"
                size="sm"
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Mark Addressed
              </Button>
            )}

            {note.status === 'ADDRESSED' && (
              <>
                <Button
                  onClick={() => setShowConfirmClear(true)}
                  disabled={changeStatusMutation.isPending}
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Clear Note
                </Button>
                <Button
                  onClick={() => setShowConfirmReject(true)}
                  disabled={changeStatusMutation.isPending}
                  variant="danger"
                  size="sm"
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
              </>
            )}
          </div>

          <Button onClick={onClose} variant="secondary" size="md">
            Close
          </Button>
        </div>

        {/* Clear Confirmation Modal */}
        {showConfirmClear && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-corporate-lg">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">Clear Review Note?</h3>
              <p className="text-sm text-forvis-gray-600 mb-4">
                This will mark the review note as cleared and resolved. This action can be reversed if needed.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowConfirmClear(false)}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleStatusChange('CLEARED')}
                  variant="primary"
                  size="md"
                  disabled={changeStatusMutation.isPending}
                  icon={changeStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  Clear Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {showConfirmReject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-corporate-lg">
              <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">Reject Review Note?</h3>
              <p className="text-sm text-forvis-gray-600 mb-4">
                Please provide a reason for rejecting this review note.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 text-sm mb-4"
                rows={3}
              />
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setShowConfirmReject(false);
                    setRejectReason('');
                  }}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleStatusChange('REJECTED', rejectReason)}
                  variant="danger"
                  size="md"
                  disabled={!rejectReason.trim() || changeStatusMutation.isPending}
                  icon={changeStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

