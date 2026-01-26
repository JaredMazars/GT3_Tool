'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useSubServiceLineGroups } from '@/hooks/service-lines/useSubServiceLineGroups';
import { LoadingSpinner, Button } from '@/components/ui';
import { formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { TaskDetailContent } from '@/components/features/tasks/TaskDetail/TaskDetailContent';
import { useTask } from '@/hooks/tasks/useTaskData';
import { useClientAcceptanceStatus } from '@/hooks/acceptance/useClientAcceptanceStatus';

export default function ClientProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const subServiceLineGroup = params.subServiceLineGroup as string;
  const GSClientID = params.id as string;
  const taskId = params.taskId as string;
  
  // Check if user navigated from My Tasks tab
  const fromMyTasks = searchParams.get('from') === 'my-tasks';
  
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string>('');
  
  // Lazy load sub-service line groups to get the description (non-critical for breadcrumb)
  const { data: subGroups } = useSubServiceLineGroups({
    serviceLine: serviceLine || '',
    enabled: !!serviceLine,
  });
  
  // Find the current sub-service line group to get its description
  const currentSubGroup = subGroups?.find(sg => sg.code === subServiceLineGroup);
  const subServiceLineGroupDescription = currentSubGroup?.description || subServiceLineGroup;
  
  const { data: task, isLoading: taskLoading } = useTask(taskId);
  
  // Fetch client acceptance status if this is a client task
  const { data: clientAcceptanceStatus } = useClientAcceptanceStatus(task?.GSClientID || null);
  
  // Verify user has access to this task and service line
  useEffect(() => {
    async function validateAccess() {
      if (!taskId || !serviceLine || !subServiceLineGroup) {
        setHasAccess(false);
        setAccessError('Invalid request parameters');
        return;
      }

      try {
        // Check if user has access to the sub-service line group
        const response = await fetch('/api/service-lines');
        if (!response.ok) {
          setHasAccess(false);
          setAccessError('Unable to verify service line access');
          return;
        }

        const result = await response.json();
        const serviceLines = result.data;

        // Check if user has access to this specific sub-service-line group
        const hasSubGroupAccess = serviceLines.some((sl: any) => 
          sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
        );

        if (!hasSubGroupAccess) {
          setHasAccess(false);
          setAccessError('You do not have access to this service line');
          return;
        }

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
  }, [taskId, serviceLine, subServiceLineGroup]);

  // Check client acceptance after task data is loaded
  useEffect(() => {
    if (task && task.GSClientID && clientAcceptanceStatus !== undefined) {
      if (!clientAcceptanceStatus?.approved) {
        setHasAccess(false);
        setAccessError('Client Acceptance must be completed and approved before accessing this task');
      }
    }
  }, [task, clientAcceptanceStatus]);

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
    const isClientAcceptanceError = accessError?.includes('Client Acceptance');
    const clientDetailsUrl = task?.GSClientID 
      ? `/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${task.GSClientID}`
      : '/dashboard';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-forvis-warning-500 mb-4" />
          <h1 className="text-2xl font-bold text-forvis-gray-900 mb-2">Access Denied</h1>
          <p className="text-forvis-gray-600 mb-4">
            {accessError || 'You do not have access to this task or service line.'}
          </p>
          <div className="flex gap-3 justify-center">
            {isClientAcceptanceError && task?.GSClientID ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(clientDetailsUrl)}
              >
                Go to Client Details
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/dashboard')}
              >
                Return to Dashboard
              </Button>
            )}
          </div>
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

          {/* Task header skeleton */}
          <div className="card mb-4">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-64 bg-forvis-gray-200 rounded animate-pulse"></div>
                    <div className="h-6 w-32 bg-forvis-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 w-48 bg-forvis-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="h-3 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-forvis-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
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
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}${fromMyTasks ? '?tab=my-tasks' : ''}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {subServiceLineGroupDescription}
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <Link 
            href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${GSClientID}`} 
            className="hover:text-forvis-gray-900 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {task?.client?.clientNameFull || task?.client?.clientCode || 'Client'}
          </Link>
          <ChevronRight className="h-4 w-4" />
          
          <span className="text-forvis-gray-900 font-medium">{task?.name}</span>
        </nav>

        {/* Task Detail Content */}
        <TaskDetailContent
          taskId={taskId}
          serviceLine={serviceLine}
          subServiceLineGroup={subServiceLineGroup}
          clientId={GSClientID}
          showHeader={true}
        />
      </div>
    </div>
  );
}
