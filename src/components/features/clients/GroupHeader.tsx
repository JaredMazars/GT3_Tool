'use client';

import { Users, HandCoins, FileClock } from 'lucide-react';
import { useGroupWip } from '@/hooks/groups/useGroupWip';
import { useGroupDebtors } from '@/hooks/groups/useGroupDebtors';

interface GroupHeaderProps {
  groupCode: string;
  groupDesc: string;
  clientCount: number;
}

export function GroupHeader({ groupCode, groupDesc, clientCount }: GroupHeaderProps) {
  const { data: wipData } = useGroupWip(groupCode);
  const { data: debtorData } = useGroupDebtors(groupCode);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="card mb-6">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-16 h-16 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="h-8 w-8 text-forvis-blue-600" />
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

          {/* Group Balances */}
          {wipData && wipData.overall && debtorData && debtorData.overall && (
            <div className="ml-8 flex gap-4">
              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">WIP Balance</p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(wipData.overall.balWIP)}</p>
                  </div>
                  <div
                    className="rounded-full p-2.5 ml-3"
                    style={{ background: 'linear-gradient(135deg, #5B93D7, #2E5AAC)' }}
                  >
                    <FileClock className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Debtor Balance</p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(debtorData.overall.totalBalance)}</p>
                  </div>
                  <div
                    className="rounded-full p-2.5 ml-3"
                    style={{ background: 'linear-gradient(135deg, #5B93D7, #2E5AAC)' }}
                  >
                    <HandCoins className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

