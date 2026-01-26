'use client';

import { ChevronRight, Home } from 'lucide-react';

interface Folder {
  id: number;
  name: string;
  parentFolderId: number | null;
}

interface BreadcrumbNavProps {
  folders: Folder[];
  currentFolderId: number | null;
  onNavigate: (folderId: number | null) => void;
}

export function BreadcrumbNav({ folders, currentFolderId, onNavigate }: BreadcrumbNavProps) {
  // Build the path from root to current folder
  const buildPath = (): Folder[] => {
    if (currentFolderId === null) {
      return [];
    }

    const path: Folder[] = [];
    let currentId: number | null = currentFolderId;

    // Traverse up the tree to build the path
    while (currentId !== null) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder); // Add to beginning of array
        currentId = folder.parentFolderId;
      } else {
        break;
      }
    }

    return path;
  };

  const path = buildPath();

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate(null)}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          currentFolderId === null
            ? 'text-forvis-blue-600 font-medium'
            : 'text-forvis-gray-600 hover:text-forvis-blue-600 hover:bg-forvis-blue-50'
        }`}
        aria-label="Navigate to root"
      >
        <Home className="w-4 h-4" />
        <span>Root</span>
      </button>

      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-forvis-gray-400" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`px-2 py-1 rounded transition-colors truncate max-w-[200px] ${
              index === path.length - 1
                ? 'text-forvis-blue-600 font-medium'
                : 'text-forvis-gray-600 hover:text-forvis-blue-600 hover:bg-forvis-blue-50'
            }`}
            title={folder.name}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  );
}


































