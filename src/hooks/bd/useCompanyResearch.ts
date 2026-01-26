/**
 * Company Research React Query Hook
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';

interface CompanyResearchResponse {
  success: boolean;
  data: CompanyResearchResult;
}

interface AvailabilityResponse {
  success: boolean;
  data: {
    available: boolean;
    message: string;
  };
}

/**
 * Check if company research service is available
 */
export function useCompanyResearchAvailability() {
  return useQuery({
    queryKey: ['company-research-availability'],
    queryFn: async (): Promise<AvailabilityResponse['data']> => {
      const res = await fetch('/api/bd/company-research');
      if (!res.ok) throw new Error('Failed to check research availability');
      const data: AvailabilityResponse = await res.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Research a company by name
 */
export function useCompanyResearch() {
  return useMutation({
    mutationFn: async (companyName: string): Promise<CompanyResearchResult> => {
      const res = await fetch('/api/bd/company-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Research failed' }));
        throw new Error(error.error || 'Failed to research company');
      }

      const data: CompanyResearchResponse = await res.json();
      return data.data;
    },
  });
}










