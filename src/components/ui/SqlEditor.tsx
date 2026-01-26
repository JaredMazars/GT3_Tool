/**
 * SQL Editor Component
 * Uses CodeMirror 6 for SQL syntax highlighting without external dependencies
 * Enterprise-ready: No CDN, works with Next.js SSR, smaller bundle size
 */

'use client';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export function SqlEditor({ value, onChange, height = '300px', readOnly = false }: SqlEditorProps) {
  const [Editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('@uiw/react-codemirror').then((mod) => {
      setEditor(() => mod.default);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !Editor) {
    return (
      <div 
        className="flex items-center justify-center bg-forvis-gray-50 rounded border border-forvis-gray-200"
        style={{ height }}
      >
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <Editor
      value={value}
      onChange={onChange}
      height={height}
      readOnly={readOnly}
      extensions={[
        // SQL language support will be added after import
      ]}
      theme="light"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
      className="border border-forvis-gray-300 rounded"
    />
  );
}

// Also create a version with SQL language support loaded
export function SqlEditorWithLanguage({ value, onChange, height = '300px', readOnly = false }: SqlEditorProps) {
  const [modules, setModules] = useState<{ Editor: any; sql: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load both CodeMirror and SQL language support
    Promise.all([
      import('@uiw/react-codemirror'),
      import('@codemirror/lang-sql'),
    ]).then(([editorMod, sqlMod]) => {
      setModules({ Editor: editorMod.default, sql: sqlMod.sql });
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !modules) {
    return (
      <div 
        className="flex items-center justify-center bg-forvis-gray-50 rounded border border-forvis-gray-200"
        style={{ height }}
      >
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const { Editor, sql } = modules;

  return (
    <Editor
      value={value}
      onChange={onChange}
      height={height}
      readOnly={readOnly}
      extensions={[sql()]}
      theme="light"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
      className="border border-forvis-gray-300 rounded"
    />
  );
}
