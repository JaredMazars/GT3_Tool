import React from 'react';
import { formatMarkdownToElements } from '@/lib/utils/markdownFormatter';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const elements = formatMarkdownToElements(content);

  return (
    <div className={className}>
      {elements.map((element) => {
        switch (element.type) {
          case 'h1':
            return (
              <h1 key={element.key} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                {element.content}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={element.key} className="text-xl font-bold text-gray-900 mt-6 mb-3">
                {element.content}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={element.key} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                {element.content}
              </h3>
            );
          case 'ul':
            return (
              <ul key={element.key} className="list-disc ml-6 space-y-1 mb-4">
                {element.items?.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={element.key} className="list-decimal ml-6 space-y-1 mb-4">
                {element.items?.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ol>
            );
          case 'p':
            return (
              <p
                key={element.key}
                className="text-gray-700 mb-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: element.content }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}








