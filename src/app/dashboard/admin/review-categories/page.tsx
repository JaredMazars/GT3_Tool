/**
 * Review Note Categories Admin Page
 * Allows Partner+ to manage review note categories
 */

'use client';

import { useState } from 'react';
import { CategoryList } from '@/components/features/admin/review-categories/CategoryList';
import { CategoryFormModal } from '@/components/features/admin/review-categories/CategoryFormModal';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ReviewCategory } from '@prisma/client';

export default function ReviewCategoriesAdminPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReviewCategory | null>(null);

  const handleEdit = (category: ReviewCategory) => {
    setSelectedCategory(category);
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-forvis-gray-900">Review Note Categories</h1>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Manage categories for organizing review notes across tasks
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="gradient"
          icon={<Plus className="w-4 h-4" />}
        >
          Add Category
        </Button>
      </div>

      <CategoryList onEdit={handleEdit} />

      {/* Create/Edit Modal */}
      {(showCreateModal || selectedCategory) && (
        <CategoryFormModal
          isOpen={true}
          onClose={handleCloseModal}
          category={selectedCategory || undefined}
        />
      )}
    </div>
  );
}


