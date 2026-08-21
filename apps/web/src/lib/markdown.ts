import DOMPurify from 'dompurify';

/**
 * Lightweight safe markdown renderer with XSS protection via DOMPurify
 */
export function renderSafeMarkdown(content: string): string {
  if (!content) return '';

  let html = content
    // Escape basic HTML tags first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```language \n code ```
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Quotes: > text
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Raw URLs auto-linking
  html = html.replace(/(^|[^"])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

  // Mentions: @username
  html = html.replace(/@([a-zA-Z0-9_\u00C0-\u017F]+)/g, '<span class="bg-brand/20 text-brand-light font-medium px-1.5 py-0.5 rounded cursor-pointer hover:bg-brand/30">@$1</span>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  // Clean with DOMPurify
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'del', 'code', 'pre', 'blockquote', 'a', 'span', 'br', 'p'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
