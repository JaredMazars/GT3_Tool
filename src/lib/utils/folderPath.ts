/**
 * Utility functions for working with folder paths and hierarchy
 */

export interface FolderNode {
  id: number;
  name: string;
  parentFolderId: number | null;
}

/**
 * Build an array representing the path from root to a specific folder
 * @param folders - All folders in the workspace
 * @param targetFolderId - The folder ID to build the path to (null for root)
 * @returns Array of folders from root to target, empty array for root
 */
export function buildFolderPath(
  folders: FolderNode[],
  targetFolderId: number | null
): FolderNode[] {
  if (targetFolderId === null) {
    return [];
  }

  const path: FolderNode[] = [];
  let currentId: number | null = targetFolderId;

  // Traverse up the tree to build the path
  while (currentId !== null) {
    const folder = folders.find(f => f.id === currentId);
    if (folder) {
      path.unshift(folder); // Add to beginning of array
      currentId = folder.parentFolderId;
    } else {
      break; // Folder not found, stop traversal
    }
  }

  return path;
}

/**
 * Get all parent folder IDs for a given folder
 * @param folders - All folders in the workspace
 * @param folderId - The folder ID to get parents for
 * @returns Array of parent folder IDs from root to direct parent
 */
export function getParentFolderIds(
  folders: FolderNode[],
  folderId: number
): number[] {
  const path = buildFolderPath(folders, folderId);
  return path.slice(0, -1).map(f => f.id); // All except the folder itself
}

/**
 * Get all child folder IDs for a given folder (recursive)
 * @param folders - All folders in the workspace
 * @param parentFolderId - The parent folder ID (null for root)
 * @returns Array of all descendant folder IDs
 */
export function getAllChildFolderIds(
  folders: FolderNode[],
  parentFolderId: number | null
): number[] {
  const children: number[] = [];
  
  const directChildren = folders.filter(f => f.parentFolderId === parentFolderId);
  
  for (const child of directChildren) {
    children.push(child.id);
    // Recursively get grandchildren
    children.push(...getAllChildFolderIds(folders, child.id));
  }
  
  return children;
}

/**
 * Get direct child folders for a given folder
 * @param folders - All folders in the workspace
 * @param parentFolderId - The parent folder ID (null for root)
 * @returns Array of direct child folders
 */
export function getChildFolders(
  folders: FolderNode[],
  parentFolderId: number | null
): FolderNode[] {
  return folders.filter(f => f.parentFolderId === parentFolderId);
}

/**
 * Check if a folder is a descendant of another folder
 * @param folders - All folders in the workspace
 * @param folderId - The folder to check
 * @param ancestorId - The potential ancestor folder ID
 * @returns True if folderId is a descendant of ancestorId
 */
export function isDescendantOf(
  folders: FolderNode[],
  folderId: number,
  ancestorId: number
): boolean {
  const path = buildFolderPath(folders, folderId);
  return path.some(f => f.id === ancestorId);
}


































