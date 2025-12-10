'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils/taskUtils';
import { AlertModal } from '@/components/shared/AlertModal';
import { useTaskBalances } from '@/hooks/tasks/useTaskBalances';

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
    TaskManager?: string;
    TaskManagerName?: string;
    Client?: {
      GSClientID: string;
      clientCode: string;
      clientNameFull: string | null;
    };
    wip?: {
      balWIP: number;
      balTime: number;
      balDisb: number;
    };
  };
  currentSubServiceLineGroup: string;
  serviceLine: string;
  currentSubServiceLineGroupDescription?: string;
  showClientInfo?: boolean;
  showPartnerManager?: boolean;
  additionalBadge?: ReactNode;
  masterServiceLine?: string | null; // The main service line this task belongs to
  GSClientID?: string; // Optional GSClientID for when task.Client is not populated
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
}: TaskListItemProps) {
  const [showAccessModal, setShowAccessModal] = useState(false);
  
  // Fetch task balances broken down by TTYPE
  const { data: balancesData } = useTaskBalances(task.id);
  
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
    if (!isAccessible) {
      e.preventDefault();
      setShowAccessModal(true);
    }
  };

  const taskUrl = task.Client?.GSClientID || GSClientID
    ? `/dashboard/${serviceLine.toLowerCase()}/${currentSubServiceLineGroup}/clients/${task.Client?.GSClientID || GSClientID}/tasks/${task.id}`
    : '#';

  const content = (
    <>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
            {task.TaskDesc}
          </h3>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            isAccessible 
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : 'bg-forvis-gray-100 text-forvis-gray-400 border border-forvis-gray-200'
          }`}>
            {task.TaskCode}
          </span>
          {task.Active !== 'Yes' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
              {task.Active === 'Archived' ? 'Archived' : 'Inactive'}
            </span>
          )}
          {!isAccessible && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
              Different Group
            </span>
          )}
        </div>
        
        {/* Service Line Hierarchy - Right Aligned */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.masterServiceLine && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isAccessible
                ? 'bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200'
                : 'bg-forvis-gray-50 text-forvis-gray-500 border border-forvis-gray-200'
            }`}>
              {task.masterServiceLine}
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
                <span title="Partner">
                  Partner: {task.TaskPartnerName || task.TaskPartner}
                </span>
              )}
              {task.TaskManagerName && (
                <span title="Manager">
                  Manager: {task.TaskManagerName || task.TaskManager}
                </span>
              )}
            </>
          )}
          <span className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {formatDate(task.updatedAt)}
          </span>
        </div>
        {additionalBadge}
      </div>
      
      {/* WIP Balances */}
      {balancesData && (
        <div className="mt-2 pt-2 border-t border-forvis-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className={`text-xs font-medium ${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Gross WIP</p>
              <p className={`text-sm font-semibold ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.grossWip)}
              </p>
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium ${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Provision</p>
              <p className={`text-sm font-semibold ${isAccessible ? 'text-forvis-gray-900' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.provision)}
              </p>
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium ${isAccessible ? 'text-forvis-gray-600' : 'text-forvis-gray-400'}`}>Net WIP</p>
              <p className={`text-sm font-semibold ${isAccessible ? 'text-forvis-blue-600' : 'text-forvis-gray-500'}`}>
                {formatCurrency(balancesData.netWip)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {isAccessible ? (
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
    </>
  );
}
