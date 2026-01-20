import { useState } from 'react';
import { ExtractedTemplate } from '@/types/templateExtraction';

interface ExtractionResult extends ExtractedTemplate {
  tempBlobPath: string;
  originalFileName: string;
  extractedTextLength: number;
}

export function useTemplateExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractTemplate = async (file: File): Promise<ExtractionResult> => {
    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/templates/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract template');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to extract template';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractTemplate,
    isExtracting,
    error,
  };
}
