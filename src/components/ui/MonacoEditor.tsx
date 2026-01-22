/**
 * Monaco Editor Component
 * Dynamically loaded wrapper for @monaco-editor/react with SSR disabled
 */

'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center bg-forvis-gray-50 rounded border border-forvis-gray-200">
      <LoadingSpinner size="md" />
    </div>
  ),
});

export default Editor;
