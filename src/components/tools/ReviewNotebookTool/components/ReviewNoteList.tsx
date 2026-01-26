/**
 * Review Note List Component
 * Displays filterable list of review notes
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Filter, User, Users, List, Folder, Tag, X } from 'lucide-react';
import { useReviewNotes } from '../hooks/useReviewNotes';
import { useReviewCategories } from '../hooks/useReviewCategories';
import { useTaskTeamMembers } from '@/hooks/tasks/useTaskTeamMembers';
import type { ReviewNoteStatus } from '@/types/review-notes';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';
import { CreateReviewNoteModal } from './CreateReviewNoteModal';
import { ReviewNoteDetailModal } from './ReviewNoteDetailModal';
import { ReviewNoteGroupedList } from './ReviewNoteGroupedList';

interface ReviewNoteListProps {
  taskId: number;
  statusFilter?: ReviewNoteStatus[];
  initialNoteId?: number;
}

export default function ReviewNoteList({ taskId, statusFilter, initialNoteId }: ReviewNoteListProps) {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedRaisers, setSelectedRaisers] = useState<string[]>([]);
  const [showAssigneeFilter, setShowAssigneeFilter] = useState(false);
  const [showRaisedByFilter, setShowRaisedByFilter] = useState(false);
  const assigneeFilterRef = useRef<HTMLDivElement>(null);
  const raisedByFilterRef = useRef<HTMLDivElement>(null);
  
  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reviewNotesViewMode');
      return (saved === 'grouped' ? 'grouped' : 'list') as 'list' | 'grouped';
    }
    return 'list';
  });

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/users/me`);
        if (response.ok) {
          const result = await response.json();
          setCurrentUserId(result.data?.userId || '');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    if (taskId) {
      fetchCurrentUser();
    }
  }, [taskId]);

  // Auto-open note if initialNoteId is provided
  useEffect(() => {
    if (initialNoteId && initialNoteId > 0) {
      setSelectedNoteId(initialNoteId);
    }
  }, [initialNoteId]);
  
  // Save view mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reviewNotesViewMode', viewMode);
    }
  }, [viewMode]);
  
  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
        setShowCategoryFilter(false);
      }
      if (assigneeFilterRef.current && !assigneeFilterRef.current.contains(event.target as Node)) {
        setShowAssigneeFilter(false);
      }
      if (raisedByFilterRef.current && !raisedByFilterRef.current.contains(event.target as Node)) {
        setShowRaisedByFilter(false);
      }
    };
    
    if (showCategoryFilter || showAssigneeFilter || showRaisedByFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [showCategoryFilter, showAssigneeFilter, showRaisedByFilter]);

  const { data, isLoading, error } = useReviewNotes({
    taskId,
    status: statusFilter,
    assignedTo: filterAssignedToMe ? currentUserId : (selectedAssignees.length > 0 ? selectedAssignees : undefined),
    raisedBy: selectedRaisers.length > 0 ? selectedRaisers : undefined,
    categoryId: selectedCategories.length > 0 ? selectedCategories : undefined,
    page,
    limit: viewMode === 'list' ? 20 : 1000, // Fetch all for grouped view
  });
  
  const { data: categories, isLoading: categoriesLoading } = useReviewCategories(taskId);
  const { data: teamMembers = [], isLoading: teamLoading } = useTaskTeamMembers({ taskId, enabled: !!taskId });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-6">
        Failed to load review notes. Please try again.
      </div>
    );
  }

  const notes = data?.notes || [];

  return (
    <div className="space-y-4">
      {/* Header with Filter and Add Button */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center space-x-4 flex-wrap gap-3">
          <h4 className="text-sm font-medium text-forvis-gray-700">
            {notes.length} Note{notes.length !== 1 ? 's' : ''}
          </h4>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-forvis-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 ${
                viewMode === 'list'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'bg-white text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
              title="List View"
            >
              <List className="h-3 w-3" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 border-l border-forvis-gray-300 ${
                viewMode === 'grouped'
                  ? 'bg-forvis-blue-600 text-white'
                  : 'bg-white text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
              title="Grouped View"
            >
              <Folder className="h-3 w-3" />
              <span>Grouped</span>
            </button>
          </div>
          
          {/* Filter Toggle */}
          <div className="flex items-center border border-forvis-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setFilterAssignedToMe(false)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 ${
                !filterAssignedToMe
                  ? 'bg-forvis-blue-600 text-white'
                  : 'bg-white text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
            >
              <Users className="h-3 w-3" />
              <span>All Items</span>
            </button>
            <button
              onClick={() => setFilterAssignedToMe(true)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 border-l border-forvis-gray-300 ${
                filterAssignedToMe
                  ? 'bg-forvis-blue-600 text-white'
                  : 'bg-white text-forvis-gray-700 hover:bg-forvis-gray-50'
              }`}
            >
              <User className="h-3 w-3" />
              <span>My Items</span>
            </button>
          </div>
          
          {/* Category Filter */}
          <div className="relative" ref={categoryFilterRef}>
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 border rounded-md ${
                selectedCategories.length > 0
                  ? 'bg-forvis-blue-600 text-white border-forvis-blue-600'
                  : 'bg-white text-forvis-gray-700 border-forvis-gray-300 hover:bg-forvis-gray-50'
              }`}
            >
              <Tag className="h-3 w-3" />
              <span>
                {selectedCategories.length > 0 
                  ? `${selectedCategories.length} ${selectedCategories.length === 1 ? 'Category' : 'Categories'}` 
                  : 'Categories'}
              </span>
              {selectedCategories.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategories([]);
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  title="Clear category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
            
            {/* Category Dropdown */}
            {showCategoryFilter && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-forvis-gray-300 rounded-md shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
                {categoriesLoading ? (
                  <div className="p-3 text-xs text-forvis-gray-500">Loading categories...</div>
                ) : categories && categories.length > 0 ? (
                  <div className="py-1">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center px-3 py-2 hover:bg-forvis-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                            }
                          }}
                          className="mr-2 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-forvis-gray-900">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-forvis-gray-500 truncate">{category.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="w-full text-left px-3 py-2 text-xs text-forvis-blue-600 hover:bg-forvis-gray-50 border-t border-forvis-gray-200"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-xs text-forvis-gray-500">No categories available</div>
                )}
              </div>
            )}
          </div>
          
          {/* Assignee Filter */}
          <div className="relative" ref={assigneeFilterRef}>
            <button
              onClick={() => setShowAssigneeFilter(!showAssigneeFilter)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 border rounded-md ${
                selectedAssignees.length > 0
                  ? 'bg-forvis-blue-600 text-white border-forvis-blue-600'
                  : 'bg-white text-forvis-gray-700 border-forvis-gray-300 hover:bg-forvis-gray-50'
              }`}
            >
              <User className="h-3 w-3" />
              <span>
                {selectedAssignees.length > 0 
                  ? `${selectedAssignees.length} Assignee${selectedAssignees.length === 1 ? '' : 's'}` 
                  : 'Assignee'}
              </span>
              {selectedAssignees.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAssignees([]);
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  title="Clear assignee filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
            
            {showAssigneeFilter && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-forvis-gray-300 rounded-md shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
                {teamLoading ? (
                  <div className="p-3 text-xs text-forvis-gray-500">Loading team members...</div>
                ) : teamMembers && teamMembers.length > 0 ? (
                  <div className="py-1">
                    {teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center px-3 py-2 hover:bg-forvis-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAssignees([...selectedAssignees, member.userId]);
                            } else {
                              setSelectedAssignees(selectedAssignees.filter((id) => id !== member.userId));
                            }
                          }}
                          className="mr-2 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-500"
                        />
                        <div className="text-xs font-medium text-forvis-gray-900">
                          {member.User.name || member.User.email}
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => setSelectedAssignees([])}
                      className="w-full text-left px-3 py-2 text-xs text-forvis-blue-600 hover:bg-forvis-gray-50 border-t border-forvis-gray-200"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-xs text-forvis-gray-500">No team members available</div>
                )}
              </div>
            )}
          </div>
          
          {/* Raised By Filter */}
          <div className="relative" ref={raisedByFilterRef}>
            <button
              onClick={() => setShowRaisedByFilter(!showRaisedByFilter)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center space-x-1 border rounded-md ${
                selectedRaisers.length > 0
                  ? 'bg-forvis-blue-600 text-white border-forvis-blue-600'
                  : 'bg-white text-forvis-gray-700 border-forvis-gray-300 hover:bg-forvis-gray-50'
              }`}
            >
              <Users className="h-3 w-3" />
              <span>
                {selectedRaisers.length > 0 
                  ? `${selectedRaisers.length} Raiser${selectedRaisers.length === 1 ? '' : 's'}` 
                  : 'Raised By'}
              </span>
              {selectedRaisers.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRaisers([]);
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  title="Clear raised by filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
            
            {showRaisedByFilter && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-forvis-gray-300 rounded-md shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
                {teamLoading ? (
                  <div className="p-3 text-xs text-forvis-gray-500">Loading team members...</div>
                ) : teamMembers && teamMembers.length > 0 ? (
                  <div className="py-1">
                    {teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center px-3 py-2 hover:bg-forvis-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRaisers.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRaisers([...selectedRaisers, member.userId]);
                            } else {
                              setSelectedRaisers(selectedRaisers.filter((id) => id !== member.userId));
                            }
                          }}
                          className="mr-2 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-500"
                        />
                        <div className="text-xs font-medium text-forvis-gray-900">
                          {member.User.name || member.User.email}
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => setSelectedRaisers([])}
                      className="w-full text-left px-3 py-2 text-xs text-forvis-blue-600 hover:bg-forvis-gray-50 border-t border-forvis-gray-200"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-xs text-forvis-gray-500">No team members available</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Review Note</span>
        </Button>
      </div>

      {/* Note List */}
      {notes.length === 0 ? (
        <div className="text-center p-12 bg-forvis-gray-50 rounded-lg">
          <p className="text-forvis-gray-600">No review notes found.</p>
          <p className="text-sm text-forvis-gray-500 mt-2">
            Click "Add Review Note" to create your first review note.
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped View */
        categoriesLoading ? (
          <LoadingSpinner />
        ) : (
          <ReviewNoteGroupedList
            notes={notes}
            categories={categories || []}
            onNoteClick={(noteId) => setSelectedNoteId(noteId)}
          />
        )
      ) : (
        /* List View */
        <div className="space-y-2">
          {notes.map((note) => {
            const getPriorityColor = (priority: string) => {
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

            const getStatusColor = (status: string) => {
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

            return (
              <div
                key={note.id}
                className="bg-white border border-forvis-gray-200 rounded-lg p-4 hover:shadow-md hover:border-forvis-blue-300 transition-all cursor-pointer"
                onClick={() => setSelectedNoteId(note.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-forvis-gray-900 flex-1">{note.title}</h5>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(note.priority)}`}>
                          {note.priority}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(note.status)}`}>
                          {note.status}
                        </span>
                      </div>
                    </div>
                    
                    {note.description && (
                      <p className="text-sm text-forvis-gray-600 mt-1 line-clamp-2">
                        {note.description}
                      </p>
                    )}
                    
                    {/* Category Badge */}
                    {note.categoryId && categories && (
                      <div className="mt-2">
                        {(() => {
                          const category = categories.find((c) => c.id === note.categoryId);
                          return category ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded border bg-forvis-gray-100 text-forvis-gray-700 border-forvis-gray-300">
                              <Tag className="w-3 h-3" />
                              <span>{category.name}</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}
                    
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-forvis-gray-500">
                      {/* Assignees */}
                      {note.ReviewNoteAssignee && note.ReviewNoteAssignee.length > 0 && (
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span>Assigned:</span>
                          {note.ReviewNoteAssignee.map((assignee) => (
                            <span key={assignee.id} className="inline-flex items-center px-1.5 py-0.5 rounded bg-forvis-blue-100 text-forvis-blue-800 text-xs">
                              {assignee.User_ReviewNoteAssignee_userIdToUser.name || assignee.User_ReviewNoteAssignee_userIdToUser.email}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Sitting With Indicator */}
                      {note.User_ReviewNote_currentOwnerToUser && (
                        <span className="flex items-center space-x-1 font-medium text-forvis-blue-700">
                          <User className="w-3 h-3" />
                          <span>Sitting with: {note.User_ReviewNote_currentOwnerToUser.name || note.User_ReviewNote_currentOwnerToUser.email}</span>
                        </span>
                      )}
                      {note.dueDate && (
                        <span>Due: {new Date(note.dueDate).toLocaleDateString()}</span>
                      )}
                      {note._count && (
                        <div className="flex items-center space-x-3">
                          {note._count.ReviewNoteComment > 0 && (
                            <span className="flex items-center space-x-1">
                              <Filter className="w-3 h-3" />
                              <span>{note._count.ReviewNoteComment}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination (List View Only) */}
      {viewMode === 'list' && data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-forvis-gray-700">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.pagination.totalPages}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Review Note Modal */}
      <CreateReviewNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        taskId={taskId}
      />

      {/* Review Note Detail Modal */}
      {selectedNoteId && (
        <ReviewNoteDetailModal
          isOpen={!!selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
          taskId={taskId}
          noteId={selectedNoteId}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

