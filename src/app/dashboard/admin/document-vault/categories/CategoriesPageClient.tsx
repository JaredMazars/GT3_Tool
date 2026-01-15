'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';

export function CategoriesPageClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/document-vault/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || 'Failed to load categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group categories by document type
  const groupedCategories = categories.reduce((acc, cat) => {
    const type = cat.documentType || 'General';
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="secondary" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Categories by Type */}
      {Object.entries(groupedCategories).map(([type, cats]) => (
        <div key={type} className="bg-white rounded-lg border border-forvis-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-forvis-gray-50 border-b border-forvis-gray-200">
            <h2 className="text-lg font-semibold text-forvis-gray-900">{type} Categories</h2>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {cats.map((cat) => (
              <div key={cat.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {cat.color && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Settings className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-forvis-gray-900">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs text-forvis-gray-600 mt-0.5">{cat.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-forvis-gray-600">
                    {cat.documentCount} documents
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    cat.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {cat.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-forvis-gray-600">No categories found</p>
        </div>
      )}
    </div>
  );
}
