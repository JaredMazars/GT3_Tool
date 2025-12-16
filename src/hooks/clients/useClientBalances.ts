'use client';

import { useQuery } from '@tanstack/react-query';

// Query Keys
export const clientBalancesKeys = {
  all: ['client-balances'] as const,
  detail: (GSClientID: string) => [...clientBalancesKeys.all, GSClientID] as const,
};

// Types
export interface ClientBalances {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  // Breakdown components
  time: number;
  timeAdjustments: number;
  disbursements: number;
  disbursementAdjustments: number;
  fees: number;
  provision: number;
  // Calculated totals
  grossWip: number;
  netWip: number;
  debtorBalance: number;
  lastUpdated: string | null;
}

export interface UseClientBalancesParams {
  enabled?: boolean;
}

/**
 * Fetch WIP and Debtor balances for a client with detailed breakdown
 * Returns balances calculated from transaction tables:
 * 
 * Breakdown Components:
 * - time: Time transactions
 * - timeAdjustments: Time adjustments
 * - disbursements: Disbursement transactions
 * - disbursementAdjustments: Disbursement adjustments
 * - fees: Fee transactions (reversed/subtracted)
 * - provision: Provision transactions
 * 
 * Calculated Totals:
 * - grossWip: Time + Adjustments + Disbursements - Fees
 * - netWip: Gross WIP + Provision
 * - debtorBalance: Sum of debtor transactions
 */
export function useClientBalances(
  GSClientID: string,
  params: UseClientBalancesParams = {}
) {
  const { enabled = true } = params;

  return useQuery<ClientBalances>({
    queryKey: clientBalancesKeys.detail(GSClientID),
    queryFn: async () => {
      const url = `/api/clients/${GSClientID}/balances`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client balances');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 10 * 60 * 1000, // 10 minutes - aligned with business rules cache TTL
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

