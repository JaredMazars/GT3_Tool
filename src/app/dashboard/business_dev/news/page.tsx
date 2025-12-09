/**
 * Company News Management Page
 * View all bulletins (all users), manage bulletins (admins)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ChevronRightIcon, 
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { BulletinCard } from '@/components/features/news/BulletinCard';
import { BulletinForm } from '@/components/features/news/BulletinForm';
import { BulletinDetailModal } from '@/components/features/news/BulletinDetailModal';
import { 
  useNewsBulletins, 
  useCreateBulletin, 
  useUpdateBulletin, 
  useDeleteBulletin,
  useToggleBulletinPin,
} from '@/hooks/news/useNewsBulletins';
import { useFeature } from '@/hooks/auth/usePermissions';
import { Feature } from '@/lib/permissions/features';
import { NewsBulletin, BulletinCategory } from '@/types';
import type { CreateNewsBulletinInput, UpdateNewsBulletinInput } from '@/lib/validation/schemas';

const categoryFilterOptions = [
  { value: '', label: 'All Categories' },
  { value: BulletinCategory.ANNOUNCEMENT, label: 'Announcement' },
  { value: BulletinCategory.POLICY_UPDATE, label: 'Policy Update' },
  { value: BulletinCategory.EVENT, label: 'Event' },
  { value: BulletinCategory.ACHIEVEMENT, label: 'Achievement' },
  { value: BulletinCategory.REMINDER, label: 'Reminder' },
  { value: BulletinCategory.CLIENT_WIN, label: 'Client Win' },
  { value: BulletinCategory.MARKET_UPDATE, label: 'Market Update' },
  { value: BulletinCategory.INDUSTRY_NEWS, label: 'Industry News' },
  { value: BulletinCategory.PARTNERSHIP, label: 'Partnership' },
  { value: BulletinCategory.HIRING, label: 'Hiring' },
];

export default function NewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<NewsBulletin | null>(null);
  const [viewingBulletin, setViewingBulletin] = useState<NewsBulletin | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NewsBulletin | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [page, setPage] = useState(1);

  // Check if user has admin permissions
  const { data: canManageNews } = useFeature(Feature.MANAGE_NEWS, 'BUSINESS_DEV');

  // Fetch bulletins
  const { data: bulletinsData, isLoading, error } = useNewsBulletins({
    search: search || undefined,
    category: categoryFilter as BulletinCategory || undefined,
    includeExpired: showExpired,
    page,
    pageSize: 20,
  });

  // Mutations
  const createMutation = useCreateBulletin();
  const deleteMutation = useDeleteBulletin();

  // Handle bulletinId from query params (from ticker navigation)
  useEffect(() => {
    const bulletinIdParam = searchParams.get('bulletinId');
    if (bulletinIdParam && bulletinsData?.bulletins) {
      const bulletinId = parseInt(bulletinIdParam, 10);
      if (!isNaN(bulletinId)) {
        // Try to find bulletin in current data
        const bulletin = bulletinsData.bulletins.find(b => b.id === bulletinId);
        if (bulletin) {
          setViewingBulletin(bulletin);
        } else {
          // Fetch bulletin individually if not in current results
          fetch(`/api/news/${bulletinId}`)
            .then(res => {
              if (res.ok) return res.json();
              throw new Error('Bulletin not found');
            })
            .then(data => {
              if (data.success && data.data) {
                setViewingBulletin(data.data);
              }
            })
            .catch(err => {
              console.error('Failed to fetch bulletin:', err);
              // Clear the query param if bulletin not found
              router.replace('/dashboard/business_dev/news');
            });
        }
      }
    }
  }, [searchParams, bulletinsData, router]);

  const handleCreate = async (data: CreateNewsBulletinInput) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create bulletin:', error);
    }
  };

  const handleEdit = (bulletin: NewsBulletin) => {
    setEditingBulletin(bulletin);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete bulletin:', error);
    }
  };

  const handleTogglePin = async (bulletin: NewsBulletin) => {
    try {
      const res = await fetch(`/api/news/${bulletin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !bulletin.isPinned }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Invalidate will happen from the mutation hook
      window.location.reload();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 py-4 mb-2">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link 
            href="/dashboard/business_dev" 
            className="hover:text-forvis-gray-900 transition-colors"
          >
            Business Development
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Company News</span>
        </nav>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-forvis-gray-900">
                Company News
              </h1>
              <p className="text-sm text-forvis-gray-600 mt-1">
                Stay updated with company announcements, updates, and important bulletins
              </p>
            </div>
            
            {canManageNews && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                <PlusIcon className="w-5 h-5" />
                New Bulletin
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search bulletins..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-forvis-gray-300 text-sm text-forvis-gray-900 placeholder:text-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-forvis-gray-300 text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors"
                >
                  {categoryFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show Expired Toggle */}
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExpired}
                  onChange={(e) => {
                    setShowExpired(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
                />
                <span className="ml-2 text-sm text-forvis-gray-700">Show Expired</span>
              </label>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
            </div>
          ) : error ? (
            <div className="rounded-xl p-4 border-2 shadow-corporate bg-red-50" style={{ borderColor: '#DC2626' }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-red-100">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold mb-1 text-red-900">
                    Error Loading Bulletins
                  </h3>
                  <p className="text-sm text-red-800">
                    Failed to load bulletins. Please try again.
                  </p>
                </div>
              </div>
            </div>
          ) : !bulletinsData?.bulletins || bulletinsData.bulletins.length === 0 ? (
            <div className="bg-white rounded-lg border border-forvis-gray-200 shadow-corporate p-12 text-center">
              <NewspaperIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-forvis-gray-900">No bulletins found</h3>
              <p className="mt-2 text-sm text-forvis-gray-600">
                {search || categoryFilter 
                  ? 'Try adjusting your filters'
                  : canManageNews 
                    ? 'Create your first bulletin to get started'
                    : 'Check back later for company updates'}
              </p>
              {canManageNews && !search && !categoryFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Bulletin
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Bulletins Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {bulletinsData.bulletins.map((bulletin) => (
                  <BulletinCard
                    key={bulletin.id}
                    bulletin={bulletin}
                    onClick={setViewingBulletin}
                    isAdmin={canManageNews}
                    onEdit={handleEdit}
                    onDelete={setDeleteConfirm}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>

              {/* Pagination */}
              {bulletinsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-forvis-gray-600">
                    Page {page} of {bulletinsData.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(bulletinsData.totalPages, p + 1))}
                    disabled={page === bulletinsData.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-forvis-gray-900 mb-4">
                Create New Bulletin
              </h2>
              <BulletinForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreateModal(false)}
                isLoading={createMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBulletin && (
        <EditBulletinModal
          bulletin={editingBulletin}
          onClose={() => setEditingBulletin(null)}
        />
      )}

      {/* View Detail Modal */}
      {viewingBulletin && (
        <BulletinDetailModal
          bulletin={viewingBulletin}
          onClose={() => {
            setViewingBulletin(null);
            // Clear bulletinId query param if it exists
            if (searchParams.get('bulletinId')) {
              router.replace('/dashboard/business_dev/news');
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-forvis-gray-900 mb-2">
              Delete Bulletin
            </h2>
            <p className="text-sm text-forvis-gray-600 mb-4">
              Are you sure you want to delete &quot;{deleteConfirm.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Modal Component
function EditBulletinModal({ 
  bulletin, 
  onClose 
}: { 
  bulletin: NewsBulletin; 
  onClose: () => void 
}) {
  const updateMutation = useUpdateBulletin(bulletin.id);

  const handleSubmit = async (data: CreateNewsBulletinInput) => {
    try {
      await updateMutation.mutateAsync(data as UpdateNewsBulletinInput);
      onClose();
    } catch (error) {
      console.error('Failed to update bulletin:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-forvis-gray-900 mb-4">
            Edit Bulletin
          </h2>
          <BulletinForm
            initialData={bulletin}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={updateMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
