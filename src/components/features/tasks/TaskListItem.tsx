'use client';

import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Clock, Lock } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { AlertModal } from '@/components/shared/AlertModal';
import { TaskWorkflowStatus } from '@/components/features/tasks/TaskWorkflowStatus';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';
import { EmployeeStatus } from '@/types';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface TaskListItemProps {
  task: {
    id: number;
    TaskDesc: string;
    TaskCode: string;
    Active: string;
    ServLineCode?: string;
    ServLineDesc?: string;
    SLGroup: string;
    subServiceLineGroupCode?: string | null; // The sub-service line group code this task belongs to
    subServiceLineGroupDesc?: string | null; // The sub-service line group description
    masterServiceLineDesc?: string | null; // The master service line description
    createdAt: string | Date;
    updatedAt: string | Date;
    TaskPartner?: string;
    TaskPartnerName?: string;
    TaskPartnerStatus?: EmployeeStatus;
    TaskManager?: string;
    TaskManagerName?: string;
    TaskManagerStatus?: EmployeeStatus;
    Client?: {
      GSClientID: string;
      clientCode: string;
      clientNameFull: string | null;
    };
    wip?: {
      balWIP: number;
      balTime: number;
      balDisb: number;
      netWip?: number;
      grossWip?: number;
      time?: number;
      adjustments?: number;
      disbursements?: number;
      fees?: number;
      provision?: number;
    };
    acceptanceApproved?: boolean | null; // A&C approval status
    engagementLetterUploaded?: boolean | null; // EL upload status
    dpaUploaded?: boolean | null; // DPA upload status
  };
  currentSubServiceLineGroup: string;
  serviceLine: string;
  currentSubServiceLineGroupDescription?: string;
  showClientInfo?: boolean;
  showPartnerManager?: boolean;
  additionalBadge?: ReactNode;
  masterServiceLine?: string | null; // The main service line this task belongs to
  GSClientID?: string; // Optional GSClientID for when task.Client is not populated
  fromMyTasks?: boolean; // Whether navigating from My Tasks tab
  isLocked?: boolean; // Whether task is locked due to client acceptance requirements
}

export function TaskListItem({
  task,
  currentSubServiceLineGroup,
  serviceLine,
  currentSubServiceLineGroupDescription,
  showClientInfo = true,
  showPartnerManager = false,
  additionalBadge,
  masterServiceLine,
  GSClientID,
  fromMyTasks = false,
  isLocked = false,
}: TaskListItemProps) {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  
  // Use WIP balances from task prop (loaded with client API)
  const balancesData = task.wip;
  
  // Check if task belongs to the current sub-service line group
  // Use subServiceLineGroupCode if available, otherwise fall back to SLGroup
  const taskSubGroup = task.subServiceLineGroupCode || task.SLGroup;
  const isAccessible = taskSubGroup?.toUpperCase() === currentSubServiceLineGroup?.toUpperCase();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      setShowLockedModal(true);
    } else if (!isAccessible) {
      e.preventDefault();
      setShowAccessModal(true);
    }
  };

  const taskUrl = task.Client?.GSClientID || GSClientID
    ? `/dashboard/${serviceLine.toLowerCase()}/${currentSubServiceLineGroup}/clients/${task.Client?.GSClientID || GSClientID}/tasks/${task.id}${fromMyTasks ? '?from=my-tasks' : ''}`
    : '#';

  const content = (
    <>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isLocked && <Lock className="h-4 w-4 text-forvis-warning-600" />}
            <h3 className={`text-sm font-semibold ${isLocked || !isAccessible ? 'text-forvis-gray-500' : 'text-forvis-gray-900'}`}>
              {task.TaskDesc}
            </h3>
          </div>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            isLocked || !isAccessible
              ? 'bg-forvis-gray-100 text-forvis-gray-400 border border-forvis-gray-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {task.TaskCode}
          </span>
          {task.Active !== 'Yes' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
              {task.Active === 'Archived' ? 'Archived' : 'Inactive'}
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-warning-100 text-forvis-warning-700 border border-forvis-warning-200">
              Locked
            </span>
          )}
          {!isAccessible && !isLocked && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-warning-100 text-forvis-warning-700 border border-forvis-warning-200">
              Different Group
            </span>
          )}
        </div>
        
        {/* Service Line Hierarchy - Right Aligned */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(masterServiceLine || task.masterServiceLineDesc) && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isAccessible
                ? 'bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200'
                : 'bg-forvis-gray-50 text-forvis-gray-500 border border-forvis-gray-200'
            }`}>
              {masterServiceLine || task.masterServiceLineDesc}
            </span>
          )}
          {task.subServiceLineGroupCode && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isAccessible
                ? 'bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200'
                : 'bg-forvis-gray-50 text-forvis-gray-500 border border-forvis-gray-200'
            }`}>
              {task.subServiceLineGroupCode}
            </span>
          )}
          {task.ServLineCode && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isAccessible
                ? 'bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200'
                : 'bg-forvis-gray-50 text-forvis-gray-500 border border-forvis-gray-200'
            }`}>
              {task.ServLineCode}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`flex items-center space-x-3 text-xs ${isAccessible ? 'text-forvis-gray-500' : 'text-forvis-gray-400'}`}>
          {showClientInfo && task.Client && (
            <span title="Client">
              Client: {task.Client.clientNameFull || task.Client.clientCode}
            </span>
          )}
          {showPartnerManager && (
            <>
              {task.TaskPartnerName && (
                <span title="Partner" className="flex items-center gap-1">
                  <span>Partner:</span>
                  <EmployeeStatusBadge
                    name={task.TaskPartnerName || task.TaskPartner}
                    isActive={task.TaskPartnerStatus?.isActive ?? false}
                    hasUserAccount={task.TaskPartnerStatus?.hasUserAccount ?? false}
                    variant="text"
                    iconSize="sm"
                  />
                </span>
              )}
              {task.TaskManagerName && (
                <span title="Manager" className="flex items-center gap-1">
                  <span>Manager:</span>
                  <EmployeeStatusBadge
                    name={task.TaskManagerName || task.TaskManager}
                    isActive={task.TaskManagerStatus?.isActive ?? false}
                    hasUserAccount={task.TaskManagerStatus?.hasUserAccount ?? false}
                    variant="text"
                    iconSize="sm"
                  />
                </span>
              )}
            </>
          )}
          <span className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {formatDate(task.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* A&C, EL, and DPA Status Indicators */}
          <TaskWorkflowStatus
            acceptanceApproved={task.acceptanceApproved}
            engagementLetterUploaded={task.engagementLetterUploaded}
            dpaUploaded={task.dpaUploaded}
            isClientTask={!!task.Client}
            displayMode="detailed"
          />
          {additionalBadge}
        </div>
      </div>
      
      {/* WIP Balances - Detailed Breakdown */}
      {balancesData && (
        <div 
          className="mt-2 pt-3 pb-2 px-3 rounded-lg border border-forvis-blue-100"
          style={{ background: GRADIENTS.dashboard.card }}
        >
          {/* Header */}
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isAccessible ? 'text-forvis-gray-700' : 'text-forvis-gray-500'}`}>
            WIP Breakdown
          </p>
          
          {/* Component Breakdown */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center text-xs">
              <span className={`${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Time:</span>
              <span className={`ml-1 font-medium ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.time ?? 0)}
              </span>
              {balancesData.adjustments !== 0 && (
                <>
                  <span className={`mx-1 ${isAccessible ? 'text-forvis-gray-500' : 'text-forvis-gray-400'}`}>+</span>
                  <span className={`${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Adj:</span>
                  <span className={`ml-1 font-medium ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                    {formatCurrency(balancesData.adjustments ?? 0)}
                  </span>
                </>
              )}
              <span className={`mx-2 ${isAccessible ? 'text-forvis-gray-500' : 'text-forvis-gray-400'}`}>+</span>
              <span className={`${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Disb:</span>
              <span className={`ml-1 font-medium ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.disbursements ?? 0)}
              </span>
            </div>
            
            <div className="flex items-center text-xs">
              <span className={`${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Fees:</span>
              <span className={`ml-1 font-medium ${isAccessible ? 'text-forvis-error-600' : 'text-forvis-gray-500'}`}>
                ({formatCurrency(balancesData.fees ?? 0)})
              </span>
              {balancesData.provision !== 0 && (
                <>
                  <span className={`mx-2 ${isAccessible ? 'text-forvis-gray-500' : 'text-forvis-gray-400'}`}>+</span>
                  <span className={`${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Provision:</span>
                  <span className={`ml-1 font-medium ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                    {formatCurrency(balancesData.provision ?? 0)}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Calculated Totals */}
          <div className="flex items-center justify-between pt-2 border-t border-forvis-blue-200">
            <div>
              <p className={`text-xs font-medium ${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Gross WIP</p>
              <p className={`text-sm font-semibold ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.grossWip ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-medium ${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Net WIP</p>
              <p className={`text-sm font-semibold ${isAccessible ? 'text-forvis-blue-600' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.netWip ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {isLocked ? (
        <div
          onClick={handleClick}
          className="block p-3 border border-forvis-gray-300 rounded-lg transition-all opacity-50 cursor-not-allowed bg-forvis-gray-50"
          title="Complete Client Acceptance to access this task"
        >
          {content}
        </div>
      ) : isAccessible ? (
        <Link
          href={taskUrl}
          className="block p-3 border border-forvis-gray-200 rounded-lg transition-all hover:border-forvis-blue-500 hover:shadow-sm cursor-pointer"
        >
          {content}
        </Link>
      ) : (
        <div
          onClick={handleClick}
          className="block p-3 border border-forvis-gray-200 rounded-lg transition-all opacity-50 cursor-not-allowed bg-forvis-gray-50"
          title={`This task belongs to sub-service line group: ${taskSubGroup}`}
        >
          {content}
        </div>
      )}

      <AlertModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        title="Task Not Accessible"
        message={`This task belongs to a different sub-service line group. You are currently viewing ${currentSubServiceLineGroupDescription || currentSubServiceLineGroup}. This task belongs to ${taskSubGroup}.`}
        variant="info"
      />
      
      <AlertModal
        isOpen={showLockedModal}
        onClose={() => setShowLockedModal(false)}
        title="Task Locked"
        message="Client Acceptance must be completed and approved before accessing this task. Please complete the risk assessment from the client details page."
        variant="warning"
      />
    </>
  );
}
