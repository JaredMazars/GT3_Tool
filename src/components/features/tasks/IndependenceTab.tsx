'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useTaskIndependence, useConfirmIndependence, TaskTeamWithIndependence } from '@/hooks/tasks/useTaskIndependence';
import { LoadingSpinner, Button, Card, Banner } from '@/components/ui';
import { IndependenceConfirmationModal } from './IndependenceConfirmationModal';
import { formatDate } from '@/lib/utils/taskUtils';
import { useTask } from '@/hooks/tasks/useTaskData';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface IndependenceTabProps {
  taskId: string;
  currentUserId: string;
  autoOpenConfirmation?: boolean;
}

export function IndependenceTab({ taskId, currentUserId, autoOpenConfirmation = false }: IndependenceTabProps) {
  const [selectedMember, setSelectedMember] = useState<TaskTeamWithIndependence | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: task } = useTask(taskId);
  const { data, isLoading, refetch } = useTaskIndependence(taskId);
  const confirmMutation = useConfirmIndependence(taskId);

  const teamMembers = data?.teamMembers || [];
  const clientName = task?.client?.clientNameFull || task?.client?.clientCode || 'this client';

  // Calculate statistics
  const confirmedCount = teamMembers.filter(m => m.independenceConfirmation?.confirmed).length;
  const totalCount = teamMembers.length;
  const allConfirmed = totalCount > 0 && confirmedCount === totalCount;

  // Auto-open confirmation modal when autoOpenConfirmation is true
  useEffect(() => {
    if (autoOpenConfirmation && !isLoading && teamMembers.length > 0) {
      // Find the current user's team member record
      const currentUserMember = teamMembers.find(
        m => m.userId === currentUserId && m.hasAccount !== false && !m.independenceConfirmation?.confirmed
      );
      
      if (currentUserMember) {
        setSelectedMember(currentUserMember);
        setShowModal(true);
      }
    }
  }, [autoOpenConfirmation, isLoading, teamMembers, currentUserId]);

  const handleOpenModal = (member: TaskTeamWithIndependence) => {
    // Only allow users with accounts
    if (!member.userId || member.hasAccount === false) {
      return;
    }

    // Only allow current user to confirm their own independence
    if (member.userId !== currentUserId) {
      return;
    }

    // Don't allow re-confirmation
    if (member.independenceConfirmation?.confirmed) {
      return;
    }

    setSelectedMember(member);
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleConfirm = async () => {
    if (!selectedMember) return;

    try {
      setError(null);
      await confirmMutation.mutateAsync(selectedMember.id);
      setSuccess('Independence confirmed successfully');
      setShowModal(false);
      setSelectedMember(null);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
      // Refetch to update the UI
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm independence';
      setError(errorMessage);
      setShowModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-forvis-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <Card variant="standard" className="overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-6 w-6 text-forvis-blue-600" />
                  <h2 className="text-2xl font-semibold text-forvis-gray-900">Team Independence</h2>
                </div>
                <p className="text-sm text-forvis-gray-600 mt-1 max-w-3xl">
                  All team members must confirm their independence from the client before commencing work 
                  on this engagement. Independence confirmation ensures compliance with professional 
                  standards and ethical requirements.
                </p>
              </div>
              
              {/* Status Badge */}
              <div
                className="ml-6 rounded-lg p-4 shadow-corporate border border-forvis-blue-100 flex-shrink-0"
                style={{ background: GRADIENTS.dashboard.card }}
              >
                <div className="text-center">
                  <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Confirmations</p>
                  <p className="text-3xl font-bold mt-2 text-forvis-blue-600">
                    {confirmedCount}/{totalCount}
                  </p>
                  <p className="text-xs text-forvis-gray-600 mt-1">
                    {allConfirmed ? 'Complete' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Banner */}
        {!allConfirmed && totalCount > 0 && (
          <Banner
            variant="warning"
            title="Independence Confirmations Pending"
            message={`${totalCount - confirmedCount} team member${totalCount - confirmedCount !== 1 ? 's' : ''} still need${totalCount - confirmedCount === 1 ? 's' : ''} to confirm their independence.`}
          />
        )}

        {allConfirmed && totalCount > 0 && (
          <Banner
            variant="success"
            title="All Team Members Confirmed"
            message="All team members have confirmed their independence from the client."
          />
        )}

        {/* Error/Success Messages */}
        {error && (
          <Banner
            variant="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <Banner
            variant="success"
            message={success}
            dismissible
            onDismiss={() => setSuccess(null)}
          />
        )}

        {/* Team Members List */}
        <Card variant="standard" className="overflow-hidden">
          <div className="px-4 py-3 border-b border-forvis-gray-200">
            <h3 className="text-lg font-semibold text-forvis-gray-900">Team Members</h3>
            <p className="text-sm text-forvis-gray-600 mt-1">
              Each team member must individually confirm their independence
            </p>
          </div>

          {teamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="h-12 w-12 text-forvis-gray-400 mx-auto mb-3" />
              <p className="text-sm text-forvis-gray-600">No team members assigned to this task yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-forvis-gray-200">
                <thead className="bg-forvis-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Team Member
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Confirmed Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-forvis-gray-200">
                  {teamMembers.map((member, index) => {
                    const hasAccount = member.hasAccount !== false && !!member.userId;
                    const isCurrentUser = hasAccount && member.userId === currentUserId;
                    const isConfirmed = member.independenceConfirmation?.confirmed || false;
                    const user = member.User;
                    const employee = member.Employee;

                    return (
                      <tr
                        key={member.id || `no-account-${index}`}
                        className={`${isCurrentUser ? 'bg-forvis-blue-50' : hasAccount ? 'hover:bg-forvis-gray-50' : 'bg-forvis-gray-50'} transition-colors`}
                      >
                        {/* Team Member Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user?.image ? (
                              <img
                                src={user.image}
                                alt={employee?.EmpNameFull || user.name || 'User'}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-forvis-blue-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-forvis-blue-700">
                                  {(employee?.EmpName || user?.name)?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-forvis-gray-900">
                                  {employee?.EmpNameFull || user?.name || 'Unknown User'}
                                </div>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-700">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-forvis-gray-600">
                                {employee ? (
                                  <>
                                    {employee.EmpCatDesc} • {employee.OfficeCode}
                                  </>
                                ) : (
                                  user?.email || 'No email'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-gray-100 text-forvis-gray-800">
                            {member.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isConfirmed ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-success-100 text-forvis-success-800">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-warning-100 text-forvis-warning-800">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Confirmed Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                          {member.independenceConfirmation?.confirmedAt
                            ? formatDate(member.independenceConfirmation.confirmedAt)
                            : '—'}
                        </td>

                        {/* Action Button */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!hasAccount ? (
                            <span className="text-xs text-forvis-gray-500 italic">No account</span>
                          ) : (
                            <Button
                              variant={isCurrentUser && !isConfirmed ? 'primary' : 'secondary'}
                              size="sm"
                              disabled={!isCurrentUser || isConfirmed}
                              onClick={() => handleOpenModal(member)}
                            >
                              {isConfirmed ? 'Confirmed' : 'Confirm Independence'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Confirmation Modal */}
        {selectedMember && (
          <IndependenceConfirmationModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedMember(null);
            }}
            onConfirm={handleConfirm}
            clientName={clientName}
            userName={selectedMember.User?.name || 'Unknown User'}
            isLoading={confirmMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
