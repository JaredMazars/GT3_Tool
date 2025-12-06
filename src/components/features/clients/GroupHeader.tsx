'use client';

import { UserGroupIcon } from '@heroicons/react/24/outline';

interface GroupHeaderProps {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
}

export function GroupHeader({ groupCode, groupDesc, clientCount }: GroupHeaderProps) {
  return (
    <div className="card mb-6">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-16 h-16 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-forvis-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
                {groupDesc}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-forvis-gray-600">
                <span><span className="font-medium">Group Code:</span> {groupCode}</span>
                <span><span className="font-medium">Total Clients:</span> {clientCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

