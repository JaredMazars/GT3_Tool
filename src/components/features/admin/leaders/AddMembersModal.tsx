'use client';

import { EmployeeSearchModal } from './EmployeeSearchModal';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeIds: number[]) => Promise<void>;
  excludeEmployeeIds: number[];
  groupName: string;
  groupType: 'GROUP' | 'INDIVIDUAL';
}

export function AddMembersModal({
  isOpen,
  onClose,
  onSubmit,
  excludeEmployeeIds,
  groupName,
  groupType,
}: AddMembersModalProps) {
  const handleSelect = async (employeeIds: number[]) => {
    try {
      await onSubmit(employeeIds);
      onClose();
    } catch (error) {
      console.error('Failed to add members:', error);
      // Error handling is done by the parent component
    }
  };

  return (
    <EmployeeSearchModal
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelect}
      excludeEmployeeIds={excludeEmployeeIds}
      title={
        groupType === 'INDIVIDUAL'
          ? `Assign Person to ${groupName}`
          : `Add Members to ${groupName}`
      }
    />
  );
}
