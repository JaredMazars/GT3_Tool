'use client';

import { useState, useMemo } from 'react';
import { TimeScale, ResourceData, AllocationData } from './types';
import { TimelineHeader } from './TimelineHeader';
import { ResourceRow } from './ResourceRow';
import { AllocationModal } from './AllocationModal';
import { getDateRange, generateTimelineColumns, calculateTotalHours, calculateTotalPercentage } from './utils';
import { Button, LoadingSpinner } from '@/components/ui';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { TaskRole } from '@/types';
import { startOfDay } from 'date-fns';

interface GanttTimelineProps {
  taskId: number;
  teamMembers: any[];
  currentUserRole: TaskRole;
  onAllocationUpdate: () => void;
}

export function GanttTimeline({ 
  taskId, 
  teamMembers, 
  currentUserRole,
  onAllocationUpdate 
}: GanttTimelineProps) {
  const [scale, setScale] = useState<TimeScale>('week');
  const [referenceDate] = useState(new Date());
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [creatingForUserId, setCreatingForUserId] = useState<string | null>(null);

  // Generate date range and columns
  const dateRange = useMemo(() => getDateRange(scale, referenceDate), [scale, referenceDate]);
  const columns = useMemo(() => generateTimelineColumns(dateRange, scale), [dateRange, scale]);

  // Transform team members to resource data
  const resources: ResourceData[] = useMemo(() => {
    return teamMembers.map(member => {
      const user = member.User || member.user;
      const allocations: AllocationData[] = member.startDate && member.endDate ? [{
        id: member.id,
        taskId: member.taskId,
        taskName: 'Current Task',
        role: member.role,
        // Normalize dates to start of day for consistent display
        startDate: startOfDay(new Date(member.startDate)),
        endDate: startOfDay(new Date(member.endDate)),
        allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
        allocatedPercentage: member.allocatedPercentage,
        actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null
      }] : [];

      return {
        userId: member.userId,
        userName: user?.name || '',
        userEmail: user?.email || '',
        userImage: user?.image,
        jobTitle: user?.jobTitle,
        officeLocation: user?.officeLocation,
        role: member.role,
        allocations,
        totalAllocatedHours: calculateTotalHours(allocations),
        totalAllocatedPercentage: calculateTotalPercentage(allocations)
      };
    });
  }, [teamMembers]);

  const handleEditAllocation = (allocation: AllocationData) => {
    console.log('Opening modal to edit allocation:', allocation);
    setSelectedAllocation(allocation);
    setIsModalOpen(true);
  };

  const handleCreateAllocation = (userId: string) => {
    console.log('Opening modal to create allocation for user:', userId);
    
    // Find the team member
    const member = teamMembers.find(m => m.userId === userId);
    if (!member) {
      console.error('Team member not found:', userId);
      alert('Team member not found. Please refresh the page and try again.');
      return;
    }

    // Create a new allocation template
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const newAllocation = {
      id: member.id, // Use team member id (TaskTeam.id)
      taskId: taskId,
      taskName: 'Current Task',
      role: member.role,
      startDate: today,
      endDate: nextWeek,
      allocatedHours: null,
      allocatedPercentage: null,
      actualHours: null
    };

    console.log('Created allocation template:', newAllocation);
    setSelectedAllocation(newAllocation);
    setCreatingForUserId(userId);
    setIsModalOpen(true);
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      // Find the team member to get their ID
      const member = teamMembers.find(m => m.userId === userId);
      if (!member) return;

      const response = await fetch(`/api/tasks/${taskId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      onAllocationUpdate();
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member. Please try again.');
    }
  };

  const handleSaveAllocation = async (updates: Partial<AllocationData>) => {
    if (!selectedAllocation) {
      console.error('No allocation selected for save');
      return;
    }

    setIsSaving(true);
    console.log('Saving allocation:', { teamMemberId: selectedAllocation.id, updates });
    
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${selectedAllocation.id}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: updates.startDate?.toISOString(),
            endDate: updates.endDate?.toISOString(),
            allocatedHours: updates.allocatedHours,
            allocatedPercentage: updates.allocatedPercentage,
            actualHours: updates.actualHours,
            role: updates.role
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update allocation';
        throw new Error(errorMessage);
      }

      console.log('Allocation saved successfully');
      onAllocationUpdate();
      setIsModalOpen(false);
      setCreatingForUserId(null);
      setSelectedAllocation(null);
    } catch (error) {
      console.error('Error saving allocation:', error);
      const message = error instanceof Error ? error.message : 'Failed to save allocation';
      alert(message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllocation = async (allocationId: number) => {
    setIsSaving(true);
    console.log('Clearing allocation:', { teamMemberId: allocationId });
    
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${allocationId}/allocation`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to clear allocation';
        throw new Error(errorMessage);
      }

      console.log('Allocation cleared successfully');
      onAllocationUpdate();
      setIsModalOpen(false);
      setSelectedAllocation(null);
    } catch (error) {
      console.error('Error clearing allocation:', error);
      const message = error instanceof Error ? error.message : 'Failed to clear allocation';
      alert(message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDates = async (allocationId: number, startDate: Date, endDate: Date) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/team/${allocationId}/allocation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update dates';
        throw new Error(errorMessage);
      }

      // Refetch to update UI
      onAllocationUpdate();
    } catch (error) {
      console.error('Error updating dates:', error);
      const message = error instanceof Error ? error.message : 'Failed to update dates';
      alert(message);
    }
  };

  const canEdit = currentUserRole === 'ADMIN';

  return (
    <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 overflow-hidden">
      {/* Controls */}
      <div 
        className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, #F0F7FD, #E5F1FB)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-forvis-blue-600" />
            <span className="text-sm font-semibold text-forvis-gray-900">Time Scale:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setScale('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                scale === 'day'
                  ? 'text-white shadow-corporate'
                  : 'text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 hover:border-forvis-blue-400'
              }`}
              style={scale === 'day' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
            >
              Days
            </button>
            <button
              onClick={() => setScale('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                scale === 'week'
                  ? 'text-white shadow-corporate'
                  : 'text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 hover:border-forvis-blue-400'
              }`}
              style={scale === 'week' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
            >
              Weeks
            </button>
            <button
              onClick={() => setScale('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                scale === 'month'
                  ? 'text-white shadow-corporate'
                  : 'text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 hover:border-forvis-blue-400'
              }`}
              style={scale === 'month' ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' } : {}}
            >
              Months
            </button>
          </div>
        </div>

        <div className="text-sm text-forvis-gray-600">
          {resources.length} team {resources.length === 1 ? 'member' : 'members'}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
        <div className="min-w-full">
          {/* Header */}
          <div className="flex sticky top-0 z-20">
            {/* User info column header */}
            <div className="w-64 flex-shrink-0 px-4 flex items-center bg-white border-b-2 border-r-2 border-forvis-gray-300 sticky left-0 z-30 h-14">
              <div className="text-sm font-semibold text-forvis-gray-900">Team Member</div>
            </div>
            {/* Timeline header */}
            <div className="flex-1">
              <TimelineHeader columns={columns} scale={scale} />
            </div>
          </div>

          {/* Resource Rows */}
          {resources.length === 0 ? (
            <div className="text-center py-12 text-forvis-gray-600">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No team members</p>
              <p className="text-sm mt-1">Add team members to see their allocations</p>
            </div>
          ) : (
            resources.map((resource) => (
              <ResourceRow
                key={resource.userId}
                resource={resource}
                columns={columns}
                scale={scale}
                dateRange={dateRange}
                onEditAllocation={canEdit ? handleEditAllocation : () => {}}
                onUpdateDates={canEdit ? handleUpdateDates : undefined}
                onRemoveMember={canEdit ? handleRemoveMember : undefined}
                onCreateAllocation={canEdit ? handleCreateAllocation : undefined}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div 
        className="px-6 py-3 border-t-2 border-forvis-gray-200 flex items-center justify-between text-xs"
        style={{ background: 'linear-gradient(to right, #F8F9FA, #F0F7FD)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)' }} />
            <span className="text-forvis-gray-700">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }} />
            <span className="text-forvis-gray-700">Reviewer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)' }} />
            <span className="text-forvis-gray-700">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)' }} />
            <span className="text-forvis-gray-700">Viewer</span>
          </div>
        </div>
        <div className="text-forvis-gray-600">
          {canEdit ? 'Click timeline to create allocation • Click tiles to edit' : 'Click tiles to view details'}
        </div>
      </div>

      {/* Allocation Modal */}
      <AllocationModal
        allocation={selectedAllocation}
        isOpen={isModalOpen}
        onClose={() => {
          console.log('Closing allocation modal');
          setIsModalOpen(false);
          setSelectedAllocation(null);
          setCreatingForUserId(null);
        }}
        onSave={handleSaveAllocation}
        onClear={handleClearAllocation}
      />
    </div>
  );
}


