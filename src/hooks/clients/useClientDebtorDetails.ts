'use client';

import { useQuery } from '@tanstack/react-query';
import { InvoicesByBucket } from '@/lib/services/analytics/debtorAggregation';

// Query Keys
export const clientDebtorDetailsKeys = {
  all: ['client-debtor-details'] as const,
  detail: (GSClientID: string) => [...clientDebtorDetailsKeys.all, GSClientID] as const,
};

// Types
export interface ClientDebtorDetailsData {
  GSClientID: string;
  clientCode: string;
  clientName: string | null;
  invoicesByBucket: InvoicesByBucket;
  totalInvoices: number;
}

export interface UseClientDebtorDetailsParams {
  enabled?: boolean;
}

/**
 * Fetch detailed invoice information for a client, grouped by aging bucket
 * Returns invoice details with payment history for all aging buckets
 */
export function useClientDebtorDetails(
  GSClientID: string,
  params: UseClientDebtorDetailsParams = {}
) {
  const { enabled = true } = params;

  return useQuery<ClientDebtorDetailsData>({
    queryKey: clientDebtorDetailsKeys.detail(GSClientID),
    queryFn: async () => {
      const url = `/api/clients/${GSClientID}/debtors/details`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch client debtor details');
      
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}


































