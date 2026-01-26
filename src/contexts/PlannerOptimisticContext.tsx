'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ServiceLineRole } from '@/types';

/**
 * Optimistic allocation update data
 * Represents changes made to an allocation before server confirmation
 */
export interface OptimisticAllocationUpdate {
  allocationId: number;
  taskId: number;
  updates: {
    startDate?: Date;
    endDate?: Date;
    allocatedHours?: number | null;
    allocatedPercentage?: number | null;
    actualHours?: number | null;
    role?: ServiceLineRole | string;
  };
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Pending mutation state for tracking in-flight API calls
 */
export interface PendingMutation {
  allocationId: number;
  type: 'update' | 'create' | 'delete';
  timestamp: number;
}

/**
 * Context value interface
 */
interface PlannerOptimisticContextValue {
  // Optimistic updates map (allocationId -> update data)
  optimisticUpdates: Map<number, OptimisticAllocationUpdate>;
  
  // Pending mutations for tracking save state
  pendingMutations: Map<number, PendingMutation>;
  
  // Add an optimistic update (call before API request)
  addOptimisticUpdate: (
    allocationId: number,
    taskId: number,
    updates: OptimisticAllocationUpdate['updates']
  ) => void;
  
  // Mark an optimistic update as confirmed (call after successful API response)
  confirmOptimisticUpdate: (allocationId: number) => void;
  
  // Mark an optimistic update as failed and remove it (call on API error)
  revertOptimisticUpdate: (allocationId: number) => void;
  
  // Clear all optimistic updates (call after full data refresh)
  clearAllOptimisticUpdates: () => void;
  
  // Get merged allocation data (server data + optimistic updates)
  getOptimisticAllocation: <T extends { id?: number; allocationId?: number }>(
    allocation: T
  ) => T;
  
  // Check if there are any pending mutations
  hasPendingMutations: boolean;
  
  // Get count of pending mutations
  pendingMutationCount: number;
  
  // Track a mutation start
  startMutation: (allocationId: number, type: PendingMutation['type']) => void;
  
  // Track a mutation end
  endMutation: (allocationId: number) => void;
}

const PlannerOptimisticContext = createContext<PlannerOptimisticContextValue | null>(null);

interface PlannerOptimisticProviderProps {
  children: ReactNode;
}

/**
 * Provider component for managing optimistic updates across planner views
 * 
 * This context enables instant UI updates when users modify allocations,
 * with automatic rollback on failure and confirmation on success.
 * 
 * Usage:
 * 1. Wrap your planner views with <PlannerOptimisticProvider>
 * 2. Use usePlannerOptimistic() hook in components that display/modify allocations
 * 3. Call addOptimisticUpdate() before making API call
 * 4. Call confirmOptimisticUpdate() or revertOptimisticUpdate() based on API result
 */
export function PlannerOptimisticProvider({ children }: PlannerOptimisticProviderProps) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, OptimisticAllocationUpdate>>(
    () => new Map()
  );
  const [pendingMutations, setPendingMutations] = useState<Map<number, PendingMutation>>(
    () => new Map()
  );

  const addOptimisticUpdate = useCallback((
    allocationId: number,
    taskId: number,
    updates: OptimisticAllocationUpdate['updates']
  ) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(allocationId, {
        allocationId,
        taskId,
        updates,
        timestamp: Date.now(),
        status: 'pending'
      });
      return next;
    });
  }, []);

  const confirmOptimisticUpdate = useCallback((allocationId: number) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      const update = next.get(allocationId);
      if (update) {
        // Mark as confirmed, then remove after a short delay
        // This allows time for the React Query cache to update
        next.set(allocationId, { ...update, status: 'confirmed' });
        
        // Schedule removal after cache has likely refreshed
        setTimeout(() => {
          setOptimisticUpdates(current => {
            const updated = new Map(current);
            updated.delete(allocationId);
            return updated;
          });
        }, 500);
      }
      return next;
    });
  }, []);

  const revertOptimisticUpdate = useCallback((allocationId: number) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.delete(allocationId);
      return next;
    });
  }, []);

  const clearAllOptimisticUpdates = useCallback(() => {
    setOptimisticUpdates(new Map());
  }, []);

  const getOptimisticAllocation = useCallback(<T extends { id?: number; allocationId?: number }>(
    allocation: T
  ): T => {
    // Support both 'id' and 'allocationId' field names
    const allocId = allocation.allocationId ?? allocation.id;
    if (allocId === undefined) return allocation;
    
    const optimistic = optimisticUpdates.get(allocId);
    if (!optimistic || optimistic.status === 'failed') {
      return allocation;
    }

    // Merge optimistic updates into the allocation
    return {
      ...allocation,
      ...optimistic.updates,
    };
  }, [optimisticUpdates]);

  const startMutation = useCallback((allocationId: number, type: PendingMutation['type']) => {
    setPendingMutations(prev => {
      const next = new Map(prev);
      next.set(allocationId, {
        allocationId,
        type,
        timestamp: Date.now()
      });
      return next;
    });
  }, []);

  const endMutation = useCallback((allocationId: number) => {
    setPendingMutations(prev => {
      const next = new Map(prev);
      next.delete(allocationId);
      return next;
    });
  }, []);

  const hasPendingMutations = useMemo(() => pendingMutations.size > 0, [pendingMutations]);
  const pendingMutationCount = useMemo(() => pendingMutations.size, [pendingMutations]);

  const value = useMemo<PlannerOptimisticContextValue>(() => ({
    optimisticUpdates,
    pendingMutations,
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    clearAllOptimisticUpdates,
    getOptimisticAllocation,
    hasPendingMutations,
    pendingMutationCount,
    startMutation,
    endMutation,
  }), [
    optimisticUpdates,
    pendingMutations,
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    clearAllOptimisticUpdates,
    getOptimisticAllocation,
    hasPendingMutations,
    pendingMutationCount,
    startMutation,
    endMutation,
  ]);

  return (
    <PlannerOptimisticContext.Provider value={value}>
      {children}
    </PlannerOptimisticContext.Provider>
  );
}

/**
 * Hook to access the planner optimistic context
 * Must be used within a PlannerOptimisticProvider
 */
export function usePlannerOptimistic(): PlannerOptimisticContextValue {
  const context = useContext(PlannerOptimisticContext);
  
  if (!context) {
    throw new Error(
      'usePlannerOptimistic must be used within a PlannerOptimisticProvider. ' +
      'Wrap your planner components with <PlannerOptimisticProvider>.'
    );
  }
  
  return context;
}

/**
 * Optional hook that returns null if not within provider
 * Useful for components that may or may not be in the planner context
 */
export function usePlannerOptimisticOptional(): PlannerOptimisticContextValue | null {
  return useContext(PlannerOptimisticContext);
}
