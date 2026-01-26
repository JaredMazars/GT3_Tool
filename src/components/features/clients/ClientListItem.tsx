'use client';

import Link from 'next/link';
import { useClientBalances } from '@/hooks/clients/useClientBalances';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ClientListItemProps {
  client: {
    id: number;
    GSClientID: string;
    clientCode: string;
    clientNameFull: string | null;
    clientPartner: string;
    clientPartnerName?: string;
    clientPartnerStatus?: { isActive: boolean; hasUserAccount: boolean };
    clientManager: string;
    clientManagerName?: string;
    clientManagerStatus?: { isActive: boolean; hasUserAccount: boolean };
    industry: string | null;
    active: string;
    _count?: { Task: number };
  };
  serviceLine: string;
  subServiceLineGroup: string;
}

export function ClientListItem({ client, serviceLine, subServiceLineGroup }: ClientListItemProps) {
  // Fetch detailed balance breakdown
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
    <Link
      href={`/dashboard/${serviceLine.toLowerCase()}/${subServiceLineGroup}/clients/${client.GSClientID}`}
      className="block p-3 border border-forvis-gray-200 rounded-lg transition-all hover:border-forvis-blue-500 hover:shadow-sm cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-forvis-gray-900">
              {client.clientNameFull || client.clientCode}
            </h3>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {client.clientCode}
            </span>
            {client.active !== 'Yes' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 text-xs text-forvis-gray-500">
        <span title="Partner" className="flex items-center gap-1">
          <span>Partner:</span>
          <EmployeeStatusBadge
            name={client.clientPartnerName || '-'}
            isActive={client.clientPartnerStatus?.isActive ?? false}
            hasUserAccount={client.clientPartnerStatus?.hasUserAccount ?? false}
            variant="text"
            iconSize="sm"
          />
        </span>
        <span title="Manager" className="flex items-center gap-1">
          <span>Manager:</span>
          <EmployeeStatusBadge
            name={client.clientManagerName || '-'}
            isActive={client.clientManagerStatus?.isActive ?? false}
            hasUserAccount={client.clientManagerStatus?.hasUserAccount ?? false}
            variant="text"
            iconSize="sm"
          />
        </span>
        {client.industry && (
          <span title="Industry">
            Industry: {client.industry}
          </span>
        )}
      </div>
      
      {/* WIP Balances - Detailed Breakdown */}
      {balancesData && (
        <div 
          className="mt-2 pt-3 pb-2 px-3 rounded-lg border border-forvis-blue-100"
          style={{ background: GRADIENTS.dashboard.card }}
        >
          {/* Header */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-forvis-gray-700">
            WIP Breakdown
          </p>
          
          {/* Component Breakdown */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center text-xs">
              <span className="text-forvis-gray-600">Time:</span>
              <span className="ml-1 font-medium text-forvis-gray-900">
                {formatCurrency(balancesData.time)}
              </span>
              {balancesData.adjustments !== 0 && (
                <>
                  <span className="mx-1 text-forvis-gray-500">+</span>
                  <span className="text-forvis-gray-600">Adj:</span>
                  <span className="ml-1 font-medium text-forvis-gray-900">
                    {formatCurrency(balancesData.adjustments)}
                  </span>
                </>
              )}
              <span className="mx-2 text-forvis-gray-500">+</span>
              <span className="text-forvis-gray-600">Disb:</span>
              <span className="ml-1 font-medium text-forvis-gray-900">
                {formatCurrency(balancesData.disbursements)}
              </span>
            </div>
            
            <div className="flex items-center text-xs">
              <span className="text-forvis-gray-600">Fees:</span>
              <span className="ml-1 font-medium text-forvis-error-600">
                ({formatCurrency(balancesData.fees)})
              </span>
              {balancesData.provision !== 0 && (
                <>
                  <span className="mx-2 text-forvis-gray-500">+</span>
                  <span className="text-forvis-gray-600">Provision:</span>
                  <span className="ml-1 font-medium text-forvis-gray-900">
                    {formatCurrency(balancesData.provision)}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Calculated Totals */}
          <div className="flex items-center justify-between pt-2 border-t border-forvis-blue-200">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600">Gross WIP</p>
              <p className="text-sm font-semibold text-forvis-gray-900">
                {formatCurrency(balancesData.grossWip)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-forvis-gray-600">Net WIP</p>
              <p className="text-sm font-semibold text-forvis-blue-600">
                {formatCurrency(balancesData.netWip)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
