import { useState, useEffect } from 'react';

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

/**
 * Hook to fetch active document types for forms
 * Uses public API endpoint that returns only active types
 */
export function useDocumentTypes() {
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/document-vault/types');
      const data = await response.json();
      
      if (data.success) {
        setTypes(data.data);
      } else {
        setError(data.error || 'Failed to load document types');
      }
    } catch (err) {
      setError('Failed to load document types');
      console.error('Error fetching document types:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  return { 
    types, 
    isLoading, 
    error,
    refetch: fetchTypes 
  };
}
