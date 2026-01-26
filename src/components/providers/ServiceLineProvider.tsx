'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ServiceLine } from '@/types';
import { ServiceLineWithStats } from '@/types/dto';
import { useServiceLines } from '@/hooks/service-lines/useServiceLines';

interface ServiceLineContextType {
  currentServiceLine: ServiceLine | null;
  setCurrentServiceLine: (serviceLine: ServiceLine | null) => void;
  availableServiceLines: ServiceLineWithStats[];
  isLoading: boolean;
  refetch: () => void;
}

const ServiceLineContext = createContext<ServiceLineContextType | undefined>(undefined);

export function ServiceLineProvider({ children }: { children: ReactNode }) {
  const [currentServiceLine, setCurrentServiceLine] = useState<ServiceLine | null>(null);
  
  // Use React Query hook for service lines
  const { data: availableServiceLines = [], isLoading, refetch } = useServiceLines();

  // Store current service line in sessionStorage
  useEffect(() => {
    if (currentServiceLine) {
      sessionStorage.setItem('currentServiceLine', currentServiceLine);
    } else {
      sessionStorage.removeItem('currentServiceLine');
    }
  }, [currentServiceLine]);

  // Load current service line from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('currentServiceLine');
    if (stored) {
      setCurrentServiceLine(stored as ServiceLine);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
    currentServiceLine,
    setCurrentServiceLine,
    availableServiceLines,
    isLoading,
    refetch,
    }),
    [currentServiceLine, availableServiceLines, isLoading, refetch]
  );

  return (
    <ServiceLineContext.Provider value={value}>
      {children}
    </ServiceLineContext.Provider>
  );
}

export function useServiceLine() {
  const context = useContext(ServiceLineContext);
  if (context === undefined) {
    throw new Error('useServiceLine must be used within a ServiceLineProvider');
  }
  return context;
}

