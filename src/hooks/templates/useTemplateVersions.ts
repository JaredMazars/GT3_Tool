import { useState, useEffect } from 'react';
import { VersionHistoryItem } from '@/lib/services/templates/templateVersionService';

export function useTemplateVersions(templateId: number) {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/versions`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch versions';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [templateId]);

  return {
    versions,
    isLoading,
    error,
    refetch: fetchVersions,
  };
}

export function useCreateVersion(templateId: number) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVersion = async (changeNotes?: string) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeNotes }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create version');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createVersion,
    isCreating,
    error,
  };
}

export function useActivateVersion(templateId: number, versionId: number) {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateVersion = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/versions/${versionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'activate' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate version');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to activate version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsActivating(false);
    }
  };

  return {
    activateVersion,
    isActivating,
    error,
  };
}

export function useRestoreVersion(templateId: number, versionId: number) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreVersion = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/versions/${versionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore version');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to restore version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    restoreVersion,
    isRestoring,
    error,
  };
}
