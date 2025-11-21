'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject } from '@/hooks/projects/useProjectData';

/**
 * Smart redirect for flat project URLs
 * Redirects to the appropriate hierarchical URL based on project data:
 * - Client projects: /dashboard/[serviceLine]/clients/[clientId]/projects/[id]
 * - Internal projects: /dashboard/[serviceLine]/internal/projects/[id]
 * 
 * This maintains backward compatibility with bookmarks and old links.
 */
export default function ProjectRedirect() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const { data: project, isLoading, error } = useProject(projectId);

  useEffect(() => {
    if (project && !isLoading) {
      const serviceLine = project.serviceLine?.toLowerCase() || 'tax';
      
      if (project.clientId && project.client) {
        // Redirect to client project URL
        router.replace(`/dashboard/${serviceLine}/clients/${project.clientId}/projects/${projectId}`);
      } else {
        // Redirect to internal project URL
        router.replace(`/dashboard/${serviceLine}/internal/projects/${projectId}`);
      }
    }
  }, [project, isLoading, projectId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-forvis-gray-900 mb-2">Project Not Found</h2>
          <p className="text-forvis-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <a href="/dashboard" className="text-forvis-blue-600 hover:text-forvis-blue-700">
            Return to Dashboard
          </a>
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
