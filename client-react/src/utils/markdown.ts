import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked once with custom renderer for links
marked.use({
  breaks: false,
  gfm: true,
  renderer: {
    link({href, title, text}) {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  }
});

/**
 * Parse and sanitize markdown content
 */
export function parseMarkdown(content: string): string {
  try {
    const html = marked.parse(content) as string;
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel'],
    });
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return content;
  }
}