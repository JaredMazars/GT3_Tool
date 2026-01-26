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

    // Ordered list - limit line length to prevent ReDoS
    const safeLine = trimmedLine.length > 500 ? trimmedLine.substring(0, 500) : trimmedLine;
    const orderedMatch = safeLine.match(/^\d{1,4}\.\s+(.{1,450})$/);
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
  // Limit input length to prevent ReDoS attacks
  if (text.length > 10000) {
    text = text.substring(0, 10000);
  }
  
  let formatted = text;

  // Bold: **text** or __text__ (with length limits to prevent catastrophic backtracking)
  formatted = formatted.replace(/\*\*([^*]{1,500}?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__([^_]{1,500}?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (with length limits)
  formatted = formatted.replace(/\*([^*]{1,500}?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_([^_]{1,500}?)_/g, '<em>$1</em>');

  // Code: `code` (with length limit)
  formatted = formatted.replace(/`([^`]{1,500}?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');

  // Links: [text](url) (with length limits)
  formatted = formatted.replace(/\[([^\]]{1,200}?)\]\(([^)]{1,500}?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  return formatted;
}


