import { useState } from 'react';

export function useDraftEditing() {
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const startEditing = (draftId: number, currentTitle: string) => {
    setEditingDraftId(draftId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingDraftId(null);
    setEditingTitle('');
  };

  const isEditing = (draftId: number) => editingDraftId === draftId;

  return {
    editingDraftId,
    editingTitle,
    setEditingTitle,
    startEditing,
    cancelEditing,
    isEditing,
  };
}

