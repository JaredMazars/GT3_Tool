/**
 * Page Access Context Provider
 * Provides page access level to components
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { PageAccessLevel } from '@/types/pagePermissions';

interface PageAccessContextValue {
  accessLevel: PageAccessLevel;
  isViewOnly: boolean;
  isFullAccess: boolean;
  canEdit: boolean;
}

const PageAccessContext = createContext<PageAccessContextValue | null>(null);

interface PageAccessProviderProps {
  children: ReactNode;
  accessLevel: PageAccessLevel;
}

/**
 * Provider component that wraps pages and provides access level context
 */
export function PageAccessProvider({ children, accessLevel }: PageAccessProviderProps) {
  const value: PageAccessContextValue = {
    accessLevel,
    isViewOnly: accessLevel === PageAccessLevel.VIEW,
    isFullAccess: accessLevel === PageAccessLevel.FULL,
    canEdit: accessLevel === PageAccessLevel.FULL,
  };

  return (
    <PageAccessContext.Provider value={value}>
      {children}
    </PageAccessContext.Provider>
  );
}

/**
 * Hook to access page permission context
 * Must be used within PageAccessProvider
 */
export function usePageAccessContext() {
  const context = useContext(PageAccessContext);
  
  if (!context) {
    throw new Error('usePageAccessContext must be used within PageAccessProvider');
  }
  
  return context;
}






















