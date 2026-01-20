'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PlaceholderSuggestion,
  isStandardPlaceholder,
} from '@/types/templateExtraction';

interface PlaceholderHighlighterProps {
  content: string;
  onChange: (content: string) => void;
  suggestedPlaceholders: PlaceholderSuggestion[];
}

export function PlaceholderHighlighter({
  content,
  onChange,
  suggestedPlaceholders,
}: PlaceholderHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [highlightedHtml, setHighlightedHtml] = useState('');

  useEffect(() => {
    // Generate highlighted HTML for display
    const highlighted = highlightPlaceholders(content);
    setHighlightedHtml(highlighted);
  }, [content]);

  const highlightPlaceholders = (text: string): string => {
    // Escape HTML entities
    let result = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Find all placeholders and wrap them in spans with appropriate styling
    const placeholderRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

    result = result.replace(placeholderRegex, (match, placeholderName) => {
      const isStandard = isStandardPlaceholder(placeholderName);
      const isMalformed = !match.match(/^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}$/);

      let className = '';
      if (isMalformed) {
        className = 'malformed-placeholder';
      } else if (isStandard) {
        className = 'standard-placeholder';
      } else {
        className = 'custom-placeholder';
      }

      return `<span class="${className}">${match}</span>`;
    });

    // Preserve line breaks
    result = result.replace(/\n/g, '<br/>');

    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative h-full">
      {/* Highlighted background layer */}
      <div
        className="absolute inset-0 p-3 overflow-y-auto pointer-events-none whitespace-pre-wrap break-words font-mono text-sm text-transparent"
        style={{ lineHeight: '1.5' }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full p-3 bg-transparent resize-none focus:outline-none font-mono text-sm text-forvis-gray-900 caret-forvis-blue-600"
        style={{
          lineHeight: '1.5',
          caretColor: '#2E5AAC',
        }}
        spellCheck={false}
      />

      {/* Styles for placeholder highlighting */}
      <style jsx global>{`
        .standard-placeholder {
          background-color: rgba(34, 197, 94, 0.15);
          border-bottom: 2px solid rgb(34, 197, 94);
          padding: 0 2px;
          border-radius: 2px;
        }

        .custom-placeholder {
          background-color: rgba(234, 179, 8, 0.2);
          padding: 0 2px;
          border-radius: 2px;
        }

        .malformed-placeholder {
          background-color: rgba(239, 68, 68, 0.15);
          text-decoration: wavy underline;
          text-decoration-color: rgb(239, 68, 68);
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
