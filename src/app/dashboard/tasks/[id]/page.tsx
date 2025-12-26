'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTask } from '@/hooks/tasks/useTaskData';

/**
 * Smart redirect for flat project URLs
 * Redirects to the appropriate hierarchical URL based on project data:
 * - Client projects: /dashboard/[serviceLine]/clients/[GSClientID]/tasks/[id]
 * - Internal projects: /dashboard/[serviceLine]/internal/tasks/[id]
 * 
 * This maintains backward compatibility with bookmarks and old links.
 * Query parameters are preserved during redirection.
 */
export default function ProjectRedirect() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId = params.id as string;
  
  const { data: project, isLoading, error } = useTask(taskId);

  useEffect(() => {
    if (project && !isLoading) {
      // Get service line mapping data if available
      const subServiceLineGroup = (project as any).subServiceLineGroupCode || 'default';
      const masterServiceLine = ((project as any).masterServiceLine || project.ServLineCode)?.toLowerCase() || 'tax';
      
      // Preserve query parameters
      const queryString = searchParams.toString();
      const queryPart = queryString ? `?${queryString}` : '';
      
      if (project.GSClientID && project.client) {
        // Redirect to client project URL with full path including sub-service line group
        router.replace(`/dashboard/${masterServiceLine}/${subServiceLineGroup}/clients/${project.client.id}/tasks/${taskId}${queryPart}`);
      } else {
        // Redirect to internal project URL
        router.replace(`/dashboard/${masterServiceLine}/internal/tasks/${taskId}${queryPart}`);
      }
    }
  }, [project, isLoading, taskId, router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">Project Not Found</h2>
          <p className="text-forvis-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <Link href="/dashboard" className="text-forvis-blue-600 hover:text-forvis-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-forvis-gray-600">Loading project...</p>
      </div>
    </div>
  );
}
