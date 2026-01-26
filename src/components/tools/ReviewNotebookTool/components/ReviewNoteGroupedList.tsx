/**
 * Review Note Grouped List Component
 * Displays review notes grouped by category with expand/collapse functionality
 */

'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, User, Users, Filter, Tag } from 'lucide-react';
import type { ReviewNoteWithRelations } from '@/types/review-notes';
import type { ReviewCategory } from '@prisma/client';

interface ReviewNoteGroupedListProps {
  notes: ReviewNoteWithRelations[];
  categories: ReviewCategory[];
  onNoteClick: (noteId: number) => void;
}

interface GroupedNotes {
  categoryId: number | null;
  categoryName: string;
  categoryDescription?: string;
  sortOrder: number;
  notes: ReviewNoteWithRelations[];
}

export function ReviewNoteGroupedList({ notes, categories, onNoteClick }: ReviewNoteGroupedListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number | null>>(new Set());
  
  // Group notes by category
  const groupedNotes = useMemo(() => {
    const groups = new Map<number | null, GroupedNotes>();
    
    // Initialize groups from categories
    categories.forEach((category) => {
      groups.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        categoryDescription: category.description || undefined,
        sortOrder: category.sortOrder,
        notes: [],
      });
    });
    
    // Add uncategorized group
    groups.set(null, {
      categoryId: null,
      categoryName: 'Uncategorized',
      sortOrder: 999999,
      notes: [],
    });
    
    // Distribute notes into groups
    notes.forEach((note) => {
      const categoryId = note.categoryId || null;
      const group = groups.get(categoryId);
      
      if (group) {
        group.notes.push(note);
      } else if (categoryId !== null) {
        // Category exists in note but not in our categories list (might be deleted/inactive)
        // Add to uncategorized
        const uncategorized = groups.get(null);
        if (uncategorized) {
          uncategorized.notes.push(note);
        }
      }
    });
    
    // Convert to array and filter out empty groups, then sort
    return Array.from(groups.values())
      .filter((group) => group.notes.length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [notes, categories]);
  
  const toggleCategory = (categoryId: number | null) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  
  const expandAll = () => {
    setExpandedCategories(new Set(groupedNotes.map((g) => g.categoryId)));
  };
  
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };
  
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
  
  if (groupedNotes.length === 0) {
    return (
      <div className="text-center p-12 bg-forvis-gray-50 rounded-lg">
        <p className="text-forvis-gray-600">No review notes found.</p>
        <p className="text-sm text-forvis-gray-500 mt-2">
          Click "Add Review Note" to create your first review note.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Expand/Collapse All Controls */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-xs font-medium text-forvis-blue-600 hover:bg-forvis-blue-50 rounded-md transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-xs font-medium text-forvis-gray-600 hover:bg-forvis-gray-100 rounded-md transition-colors"
        >
          Collapse All
        </button>
      </div>
      
      {/* Grouped Notes */}
      {groupedNotes.map((group) => {
        const isExpanded = expandedCategories.has(group.categoryId);
        
        return (
          <div key={group.categoryId ?? 'uncategorized'} className="border border-forvis-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(group.categoryId)}
              className="w-full flex items-center justify-between p-4 hover:bg-forvis-gray-50 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-forvis-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-forvis-gray-600 flex-shrink-0" />
                )}
                <Tag className="w-4 h-4 text-forvis-gray-500 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="text-base font-semibold text-forvis-gray-900">
                    {group.categoryName}
                  </h3>
                  {group.categoryDescription && (
                    <p className="text-xs text-forvis-gray-500 mt-0.5">
                      {group.categoryDescription}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 text-sm font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-full">
                  {group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}
                </span>
              </div>
            </button>
            
            {/* Category Notes (Collapsible) */}
            {isExpanded && (
              <div className="border-t border-forvis-gray-200">
                <div className="p-2 space-y-2">
                  {group.notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-forvis-gray-200 rounded-lg p-4 hover:shadow-md hover:border-forvis-blue-300 transition-all cursor-pointer"
                      onClick={() => onNoteClick(note.id)}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


