'use client';

import { Building2, HandCoins, FileClock } from 'lucide-react';
import { Client } from '@/types';
import { useClientBalances } from '@/hooks/clients/useClientBalances';

interface ClientHeaderProps {
  client: Client;
  tasks?: any[];
}

export function ClientHeader({ client, tasks }: ClientHeaderProps) {
  const { data: balancesData } = useClientBalances(client.GSClientID);

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
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
                {client.clientNameFull || client.clientCode}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-forvis-gray-600">
                <span><span className="font-medium">Client Code:</span> {client.clientCode}</span>
                {client.industry && (
                  <span><span className="font-medium">Industry:</span> {client.industry}</span>
                )}
                <span><span className="font-medium">Group:</span> {client.groupDesc}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.active === 'YES' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.active === 'YES' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Client Balances */}
          {balancesData && (
            <div className="ml-8 flex gap-4">
              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">WIP Balance</p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(balancesData.wipBalance)}</p>
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
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(balancesData.debtorBalance)}</p>
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

