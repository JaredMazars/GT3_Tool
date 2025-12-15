'use client';

import { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { buildFolderPath } from '@/lib/utils/folderPath';

interface FolderNode {
  id: number;
  name: string;
  parentFolderId: number | null;
  _count?: {
    Files: number;
    ChildFolders: number;
  };
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId?: number | null;
  onSelect?: (folderId: number | null) => void;
  expandedFolders?: Set<number>;
  onToggle?: (folderId: number) => void;
}

export function FolderTree({ 
  folders, 
  selectedFolderId, 
  onSelect, 
  expandedFolders = new Set(), 
  onToggle 
}: FolderTreeProps) {
  const [localExpanded, setLocalExpanded] = useState<Set<number>>(expandedFolders);

  // Auto-expand path to selected folder
  useEffect(() => {
    if (selectedFolderId !== null && selectedFolderId !== undefined) {
      const path = buildFolderPath(folders, selectedFolderId);
      const pathIds = path.map(f => f.id);
      const newExpanded = new Set(localExpanded);
      
      // Expand all folders in the path
      pathIds.forEach(id => newExpanded.add(id));
      
      setLocalExpanded(newExpanded);
    }
  }, [selectedFolderId, folders]);

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(localExpanded);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setLocalExpanded(newExpanded);
    onToggle?.(folderId);
  };

  const buildTree = (parentId: number | null): FolderNode[] => {
    return folders.filter((f) => f.parentFolderId === parentId);
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const children = buildTree(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = localExpanded.has(folder.id);
    const isActive = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          onClick={() => onSelect?.(folder.id)}
          className={`flex items-center gap-2 py-1.5 px-3 mx-2 rounded transition-colors cursor-pointer ${
            isActive 
              ? 'bg-forvis-blue-100 text-forvis-blue-600 font-medium' 
              : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="hover:text-forvis-blue-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
          {folder._count && (folder._count.Files > 0 || folder._count.ChildFolders > 0) && (
            <span className="text-xs text-forvis-gray-500 ml-auto">
              {folder._count.Files + folder._count.ChildFolders}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = buildTree(null);
  const isRootSelected = selectedFolderId === null || selectedFolderId === undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-3 border-b border-forvis-gray-200">
        <h2 className="text-xs font-semibold text-forvis-gray-500 uppercase tracking-wider">
          Folders
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {/* Root option */}
        <div
          onClick={() => onSelect?.(null)}
          className={`flex items-center gap-2 py-2 px-3 mx-2 rounded transition-colors cursor-pointer ${
            isRootSelected
              ? 'bg-forvis-blue-100 text-forvis-blue-600 font-medium'
              : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
          }`}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm truncate flex-1">Root</span>
        </div>

        {/* Folder tree */}
        {rootFolders.length === 0 ? (
          <div className="px-3 py-4 text-sm text-forvis-gray-500">
            No folders yet
          </div>
        ) : (
          <div>
            {rootFolders.map((folder) => renderFolder(folder))}
          </div>
        )}
      </div>
    </div>
  );
}

