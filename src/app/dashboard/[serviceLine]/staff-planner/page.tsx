'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Users,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { isValidServiceLine, formatServiceLineName } from '@/lib/utils/serviceLineUtils';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { ServiceLine } from '@/types';
import { LoadingSpinner } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { GlobalPlannerFilters } from '@/components/features/planning/GlobalPlannerFilters';
import { GanttTimeline } from '@/components/features/tasks/TeamPlanner';
import { ClientPlannerTimeline } from '@/components/features/tasks/ClientPlanner';
import { EmployeePlannerList } from '@/components/features/planning/EmployeePlannerList';
import { ClientPlannerList } from '@/components/features/planning/ClientPlannerList';
import { PlannerOptimisticProvider } from '@/contexts/PlannerOptimisticContext';
import { useGlobalEmployeePlanner } from '@/hooks/planning/useGlobalEmployeePlanner';
import type { GlobalEmployeePlannerFilters, GlobalClientPlannerFilters } from '@/components/features/planning/GlobalPlannerFilters';

export default function StaffPlannerPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const serviceLine = (params.serviceLine as string)?.toUpperCase();
  const { setCurrentServiceLine } = useServiceLine();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('VIEWER');

  // Planner view mode (employees vs clients)
  const [plannerView, setPlannerView] = useState<'employees' | 'clients'>('employees');

  // Planner view type (timeline vs list)
  const [employeePlannerViewMode, setEmployeePlannerViewMode] = useState<'timeline' | 'list'>('timeline');
  const [clientPlannerViewMode, setClientPlannerViewMode] = useState<'timeline' | 'list'>('timeline');

  // Timeline pagination state
  const [timelinePage, setTimelinePage] = useState(1);

  // Employee planner filters (with service line filters)
  const [employeePlannerFilters, setEmployeePlannerFilters] = useState<GlobalEmployeePlannerFilters>({
    employees: [],
    jobGrades: [],
    offices: [],
    clients: [],
    taskCategories: [],
    serviceLines: [],
    subServiceLineGroups: [],
  });

  // Client planner filters (with service line filters)
  const [clientPlannerFilters, setClientPlannerFilters] = useState<GlobalClientPlannerFilters>({
    clients: [],
    groups: [],
    partners: [],
    tasks: [],
    managers: [],
    serviceLines: [],
    subServiceLineGroups: [],
  });

  // Fetch employee planner data for timeline view (with pagination)
  const {
    data: timelinePlannerData,
    isLoading: isLoadingTimelinePlanner,
  } = useGlobalEmployeePlanner({
    employees: employeePlannerFilters.employees,
    jobGrades: employeePlannerFilters.jobGrades,
    offices: employeePlannerFilters.offices,
    clients: employeePlannerFilters.clients,
    taskCategories: employeePlannerFilters.taskCategories,
    serviceLines: employeePlannerFilters.serviceLines,
    subServiceLineGroups: employeePlannerFilters.subServiceLineGroups,
    includeUnallocated: true,
    page: timelinePage,
    limit: 50,
    enabled: hasAccess === true && plannerView === 'employees' && employeePlannerViewMode === 'timeline',
  });

  // Reset timeline page when filters change
  useEffect(() => {
    setTimelinePage(1);
  }, [
    employeePlannerFilters.employees,
    employeePlannerFilters.jobGrades,
    employeePlannerFilters.offices,
    employeePlannerFilters.clients,
    employeePlannerFilters.taskCategories,
    employeePlannerFilters.serviceLines,
    employeePlannerFilters.subServiceLineGroups,
  ]);

  // Refetch planner data when switching between Employee/Client views
  // This ensures changes made in one view are visible in the other
  useEffect(() => {
    // Invalidate all planner data when switching views
    // The new view's queries will automatically fetch fresh data on mount (refetchOnMount: true)
    queryClient.invalidateQueries({ 
      queryKey: ['global-planner'],
      refetchType: 'none' // Don't refetch now - let components handle it when they mount
    });
    queryClient.invalidateQueries({ 
      queryKey: ['planner'],
      refetchType: 'none'
    });
  }, [plannerView, queryClient]);

  // Transform employee planner data to GanttTimeline format
  const transformedTimelineUsers = useMemo(() => {
    if (!timelinePlannerData?.allocations) {
      return [];
    }

    // Group allocations by employee
    interface EmployeeMapEntry {
      userId: string;
      employeeId: number | null;
      User: { id: string; name: string; email: string; jobTitle: string | null; officeLocation: string | null; jobGradeCode: string | null };
      role: string;
      allocations: Array<{ id: number; taskId: number; taskName: string; taskCode: string | null; clientId: number | null; clientName: string; clientCode: string; startDate: Date; endDate: Date; role: string; allocatedHours: number | null; allocatedPercentage: number | null; actualHours: number | null; isNonClientEvent: boolean; nonClientEventType: string | null; notes: string | null; isCurrentTask?: boolean }>;
      employeeStatus?: { isActive: boolean; hasUserAccount: boolean };
    }
    const employeeMap = new Map<string, EmployeeMapEntry>();

    timelinePlannerData.allocations.forEach((alloc) => {
      if (!employeeMap.has(alloc.userId)) {
        employeeMap.set(alloc.userId, {
          userId: alloc.userId,
          employeeId: alloc.employeeId,
          User: {
            id: alloc.userId,
            name: alloc.userName,
            email: alloc.userEmail,
            jobTitle: alloc.jobGradeCode,
            officeLocation: alloc.officeLocation,
            jobGradeCode: alloc.jobGradeCode,
          },
          role: alloc.serviceLineRole || 'USER',
          allocations: [],
          employeeStatus: alloc.employeeStatus,
        });
      }

      // Add all allocations: task allocations (taskId > 0) AND non-client events (taskId === 0 && isNonClientEvent)
      if (alloc.taskId > 0 || alloc.isNonClientEvent) {
        employeeMap.get(alloc.userId)!.allocations.push({
          id: alloc.allocationId,
          taskId: alloc.taskId,
          taskName: alloc.taskName,
          taskCode: alloc.taskCode,
          clientId: alloc.clientId,
          clientName: alloc.clientName,
          clientCode: alloc.clientCode,
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          role: alloc.role,
          allocatedHours: alloc.allocatedHours,
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: alloc.actualHours,
          isNonClientEvent: alloc.isNonClientEvent,
          nonClientEventType: alloc.nonClientEventType,
          notes: alloc.notes,
          isCurrentTask: alloc.isCurrentTask,
        });
      }
    });

    return Array.from(employeeMap.values()).map((employee) => ({
      userId: employee.userId,
      employeeId: employee.employeeId,
      User: employee.User,
      role: employee.role,
      allocations: employee.allocations,
      employeeStatus: employee.employeeStatus,
    }));
  }, [timelinePlannerData]);

  // Validate service line and ensure it's Country Management
  useEffect(() => {
    if (!isValidServiceLine(serviceLine)) {
      router.push('/dashboard');
    } else if (serviceLine !== 'COUNTRY_MANAGEMENT') {
      router.push(`/dashboard/${serviceLine.toLowerCase()}`);
    } else {
      setCurrentServiceLine(serviceLine as ServiceLine);
    }
  }, [serviceLine, router, setCurrentServiceLine]);

  // Check if user has access to Country Management
  useEffect(() => {
    async function checkAccess() {
      try {
        const sessionResponse = await fetch('/api/auth/session');

        if (!sessionResponse.ok) {
          setHasAccess(false);
          return;
        }

        const sessionData = await sessionResponse.json();
        const userRole = sessionData.data?.systemRole;

        // SYSTEM_ADMIN bypasses service line checks
        if (userRole === 'SYSTEM_ADMIN') {
          setHasAccess(true);
          setCurrentUserRole('ADMINISTRATOR');
          return;
        }

        // For regular users, check Country Management access
        const response = await fetch('/api/service-lines');
        if (!response.ok) {
          setHasAccess(false);
          return;
        }

        const result = await response.json();
        const serviceLines = result.data;

        // Check if user has access to Country Management
        interface ServiceLineData { serviceLineCode?: string; masterCode?: string; role?: string }
        const hasCountryMgmtAccess = serviceLines.some(
          (sl: ServiceLineData) => sl.serviceLineCode === 'COUNTRY_MANAGEMENT' || sl.masterCode === 'COUNTRY_MANAGEMENT'
        );

        setHasAccess(hasCountryMgmtAccess);

        if (hasCountryMgmtAccess) {
          const countryMgmt = serviceLines.find(
            (sl: ServiceLineData) => sl.serviceLineCode === 'COUNTRY_MANAGEMENT' || sl.masterCode === 'COUNTRY_MANAGEMENT'
          );
          setCurrentUserRole(countryMgmt?.role || 'USER');
        }

        if (!hasCountryMgmtAccess) {
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch (error) {
        console.error('Error checking staff planner access:', error);
        setHasAccess(false);
      }
    }

    checkAccess();
  }, [router]);

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

  // Show access denied message
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forvis-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold text-forvis-gray-900 mb-2">Access Denied</h1>
          <p className="text-forvis-gray-600 mb-4">
            You don&apos;t have access to the Staff Planner. This feature requires Country Management access. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isValidServiceLine(serviceLine) || serviceLine !== 'COUNTRY_MANAGEMENT') {
    return null;
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${serviceLine.toLowerCase()}`}
            className="hover:text-forvis-gray-900 transition-colors"
          >
            {formatServiceLineName(serviceLine)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">Staff Planner</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-forvis-gray-900">Staff Planner</h1>
              <p className="text-sm text-forvis-gray-600">
                View resource planning across all service lines and staff
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-corporate overflow-hidden">
          <div className="p-6">
            <PlannerOptimisticProvider>
              <div className="space-y-4">
                {/* Unified Global Planner Filters */}
                <GlobalPlannerFilters
                  plannerView={plannerView}
                  onPlannerViewChange={setPlannerView}
                  viewMode={plannerView === 'employees' ? employeePlannerViewMode : clientPlannerViewMode}
                  onViewModeChange={(mode) => {
                    if (plannerView === 'employees') {
                      setEmployeePlannerViewMode(mode);
                    } else {
                      setClientPlannerViewMode(mode);
                    }
                  }}
                  employeeFilters={employeePlannerFilters}
                  onEmployeeFiltersChange={setEmployeePlannerFilters}
                  clientFilters={clientPlannerFilters}
                  onClientFiltersChange={setClientPlannerFilters}
                  teamCount={transformedTimelineUsers.length}
                />

                {/* Timeline or List View */}
                {plannerView === 'employees' ? (
                  /* Employee Planner - Timeline or List */
                  employeePlannerViewMode === 'timeline' ? (
                    /* Employee Timeline View */
                    isLoadingTimelinePlanner ? (
                      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-forvis-gray-600">Loading timeline data...</p>
                      </div>
                    ) : transformedTimelineUsers.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-forvis-gray-400" />
                        <p className="mt-2 text-lg font-medium text-forvis-gray-900">
                          No Allocations Found
                        </p>
                        <p className="mt-1 text-sm text-forvis-gray-600">
                          Try adjusting your filters to see employee allocations.
                        </p>
                      </div>
                    ) : (
                      <>
                        <GanttTimeline
                          taskId={0}
                          teamMembers={transformedTimelineUsers}
                          currentUserRole={currentUserRole}
                          onAllocationUpdate={async () => {
                            // Invalidate BOTH cache types for cross-view sync
                            // Don't wait for refetch - let view-switching and staleTime handle it
                            queryClient.invalidateQueries({
                              queryKey: ['global-planner'],
                              refetchType: 'all',
                            });
                            queryClient.invalidateQueries({
                              queryKey: ['planner'],
                              refetchType: 'all',
                            });
                          }}
                          serviceLine={undefined}
                          subServiceLineGroup={undefined}
                        />

                        {/* Timeline Pagination Controls */}
                        {timelinePlannerData?.pagination &&
                          timelinePlannerData.pagination.totalPages > 1 && (
                            <div className="mt-4 px-6 py-4 bg-white rounded-lg shadow-corporate border-2 border-forvis-gray-200 flex items-center justify-between">
                              <div className="text-sm text-forvis-gray-600">
                                Showing {transformedTimelineUsers.length} of{' '}
                                {timelinePlannerData.pagination.total} employees &middot; Page{' '}
                                {timelinePlannerData.pagination.page} of{' '}
                                {timelinePlannerData.pagination.totalPages}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setTimelinePage(Math.max(1, timelinePage - 1))}
                                  disabled={timelinePage === 1}
                                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() =>
                                    setTimelinePage(
                                      Math.min(
                                        timelinePlannerData.pagination.totalPages,
                                        timelinePage + 1
                                      )
                                    )
                                  }
                                  disabled={
                                    timelinePage === timelinePlannerData.pagination.totalPages
                                  }
                                  className="px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-md hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                      </>
                    )
                  ) : (
                    /* Employee List View */
                    <EmployeePlannerList
                      serviceLine=""
                      subServiceLineGroup=""
                      filters={employeePlannerFilters}
                      isGlobalView={true}
                    />
                  )
                ) : /* Client Planner - Timeline or List */
                clientPlannerViewMode === 'timeline' ? (
                  /* Client Timeline View */
                  <ClientPlannerTimeline
                    serviceLine=""
                    subServiceLineGroup=""
                    currentUserRole={currentUserRole}
                    filters={clientPlannerFilters}
                    isGlobalView={true}
                    onAllocationUpdate={async () => {
                      // Invalidate BOTH cache types for cross-view sync
                      // Don't wait for refetch - let view-switching and staleTime handle it
                      queryClient.invalidateQueries({
                        queryKey: ['global-planner'],
                        refetchType: 'all',
                      });
                      queryClient.invalidateQueries({
                        queryKey: ['planner'],
                        refetchType: 'all',
                      });
                    }}
                  />
                ) : (
                  /* Client List View */
                  <ClientPlannerList
                    serviceLine=""
                    subServiceLineGroup=""
                    filters={clientPlannerFilters}
                    isGlobalView={true}
                  />
                )}
              </div>
            </PlannerOptimisticProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
