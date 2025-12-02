'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/config/queryClient';
import { ServiceLineProvider } from '@/components/providers/ServiceLineProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceLineProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </ServiceLineProvider>
    </QueryClientProvider>
  );
}



































