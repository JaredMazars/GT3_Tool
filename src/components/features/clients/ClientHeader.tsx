'use client';

import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Client } from '@/types';
import { useClientWip } from '@/hooks/clients/useClientWip';

interface ClientHeaderProps {
  client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  const { data: wipData } = useClientWip(client.ClientID);

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
              <BuildingOfficeIcon className="h-8 w-8 text-forvis-blue-600" />
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

          {/* WIP Balances */}
          {wipData && wipData.overall && (
            <div className="ml-8 flex gap-4">
              <div
                className="rounded-lg px-4 py-3 shadow-corporate text-white min-w-[140px]"
                style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
              >
                <p className="text-xs font-medium opacity-90">WIP Balance</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(wipData.overall.balWIP)}</p>
              </div>

              <div
                className="rounded-lg px-4 py-3 shadow-corporate text-white min-w-[140px]"
                style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
              >
                <p className="text-xs font-medium opacity-90">Time Balance</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(wipData.overall.balTime)}</p>
              </div>

              <div
                className="rounded-lg px-4 py-3 shadow-corporate text-white min-w-[140px]"
                style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
              >
                <p className="text-xs font-medium opacity-90">Disb Balance</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(wipData.overall.balDisb)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

