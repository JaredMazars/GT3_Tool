/**
 * Simple markdown formatter for rendering section content
 * Converts basic markdown syntax to HTML string for display
 */

interface FormattedElement {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol';
  content: string;
  items?: string[];
  key: string;
}

export function formatMarkdownToElements(markdown: string): FormattedElement[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const elements: FormattedElement[] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let elementIndex = 0;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      elements.push({
        type: listType,
        content: '',
        items: [...currentList],
        key: `list-${elementIndex++}`,
      });
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Empty line
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Headers
    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push({
        type: 'h3',
        content: trimmedLine.substring(4),
        key: `h3-${index}`,
      });
      return;
    }

    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push({
        type: 'h2',
        content: trimmedLine.substring(3),
        key: `h2-${index}`,
      });
      return;
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      elements.push({
        type: 'h1',
        content: trimmedLine.substring(2),
        key: `h1-${index}`,
      });
      return;
    }

    // Unordered list
    if (trimmedLine.startsWith('- ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(formatInlineMarkdown(trimmedLine.substring(2)));
      return;
    }

    // Ordered list
    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch && orderedMatch[1]) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(formatInlineMarkdown(orderedMatch[1]));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push({
      type: 'p',
      content: formatInlineMarkdown(trimmedLine),
      key: `p-${index}`,
    });
  });

  // Flush any remaining list
  flushList();

  return elements;
}

/**
 * Format inline markdown (bold, italic, code, links)
 */
function formatInlineMarkdown(text: string): string {
  let formatted = text;

  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

  // Code: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');

  // Links: [text](url)
  formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  return formatted;
}

