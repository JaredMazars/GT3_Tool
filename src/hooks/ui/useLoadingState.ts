import { useState } from 'react';

export function useLoadingState() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const startUpdating = () => setIsUpdating(true);
  const stopUpdating = () => setIsUpdating(false);

  const startDeleting = () => setIsDeleting(true);
  const stopDeleting = () => setIsDeleting(false);

  const startCreating = () => setIsCreating(true);
  const stopCreating = () => setIsCreating(false);

  const isAnyLoading = isUpdating || isDeleting || isCreating;

  return {
    isUpdating,
    isDeleting,
    isCreating,
    isAnyLoading,
    startUpdating,
    stopUpdating,
    startDeleting,
    stopDeleting,
    startCreating,
    stopCreating,
  };
}

