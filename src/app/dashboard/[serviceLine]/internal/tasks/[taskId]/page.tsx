'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { LoadingSpinner, Button } from '@/components/ui';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { TaskDetailContent } from '@/components/features/tasks/TaskDetail/TaskDetailContent';
import { useTask } from '@/hooks/tasks/useTaskData';

export default function InternalTaskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const taskId = params.taskId as string;
  
  // Check if user navigated from My Tasks tab
  const fromMyTasks = searchParams.get('from') === 'my-tasks';
  
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string>('');
  
  const { data: task, isLoading: taskLoading } = useTask(taskId);
  
  // Verify user has access to this task
  useEffect(() => {
    async function validateAccess() {
      if (!taskId || !serviceLine) {
        setHasAccess(false);
        setAccessError('Invalid request parameters');
        return;
      }

      try {
        // Check if user has access to the task
        const taskResponse = await fetch(`/api/tasks/${taskId}/users/me`);
        if (!taskResponse.ok) {
          setHasAccess(false);
          setAccessError('You do not have access to this task');
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error validating access:', error);
        setHasAccess(false);
        setAccessError('Error verifying access');
      }
    }

    validateAccess();
  }, [taskId, serviceLine]);

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-sm text-forvis-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-forvis-warning-500 mb-4" />
          <h1 className="text-2xl font-bold text-forvis-gray-900 mb-2">Access Denied</h1>
          <p className="text-forvis-gray-600 mb-4">
            {accessError || 'You do not have access to this task.'}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (taskLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb skeleton */}
          <nav className="flex items-center space-x-2 text-sm mb-6 py-4">
            <div className="h-4 w-20 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-forvis-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-forvis-gray-200 rounded animate-pulse"></div>
          </nav>

          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6 py-4">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <Link 
            href={
              fromMyTasks && (task as any)?.subServiceLineGroupCode
                ? `/dashboard/${serviceLine.toLowerCase()}/${(task as any).subServiceLineGroupCode}?tab=my-tasks`
                : `/dashboard/${serviceLine.toLowerCase()}/internal`
            } 
            className="hover:text-forvis-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {fromMyTasks && (task as any)?.subServiceLineGroupCode ? (task as any).subServiceLineGroupDesc || (task as any).subServiceLineGroupCode : 'Internal Tasks'}
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <span className="text-forvis-gray-900 font-medium">{task?.name}</span>
        </nav>

        {/* Task Detail Content */}
        <TaskDetailContent
          taskId={taskId}
          serviceLine={serviceLine}
          showHeader={true}
        />
      </div>
    </div>
  );
}
