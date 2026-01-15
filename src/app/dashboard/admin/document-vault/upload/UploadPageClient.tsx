'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentUploadForm } from '@/components/features/document-vault';
import { LoadingSpinner } from '@/components/ui';

export function UploadPageClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [serviceLines, setServiceLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/document-vault/categories').then(res => res.json()),
      fetch('/api/service-lines').then(res => res.json()).catch(() => ({ data: [] })),
    ]).then(([categoriesData, serviceLinesData]) => {
      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
      if (serviceLinesData.success && serviceLinesData.data) {
        setServiceLines(serviceLinesData.data.map((sl: any) => sl.code));
      }
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <DocumentUploadForm
      categories={categories}
      serviceLines={serviceLines}
      onSuccess={(documentId) => {
        router.push(`/dashboard/document-vault/${documentId}`);
      }}
      onCancel={() => {
        router.push('/dashboard/admin/document-vault');
      }}
    />
  );
}
