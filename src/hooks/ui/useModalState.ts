import { useState } from 'react';

export function useModalState() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const openDeleteConfirm = () => setShowDeleteConfirm(true);
  const closeDeleteConfirm = () => setShowDeleteConfirm(false);

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => setShowCreateModal(false);

  const openUploadModal = () => setShowUploadModal(true);
  const closeUploadModal = () => setShowUploadModal(false);

  const openEditModal = () => setShowEditModal(true);
  const closeEditModal = () => setShowEditModal(false);

  const closeAllModals = () => {
    setShowDeleteConfirm(false);
    setShowCreateModal(false);
    setShowUploadModal(false);
    setShowEditModal(false);
  };

  return {
    showDeleteConfirm,
    showCreateModal,
    showUploadModal,
    showEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    openCreateModal,
    closeCreateModal,
    openUploadModal,
    closeUploadModal,
    openEditModal,
    closeEditModal,
    closeAllModals,
  };
}

