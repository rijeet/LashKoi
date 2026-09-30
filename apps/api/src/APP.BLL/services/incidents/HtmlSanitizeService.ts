import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'h2',
    'h3',
    'h4',
    'strong',
    'em',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'img',
    'figure',
    'figcaption',
    'article',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
  },
};

export class HtmlSanitizeService {
  sanitize(html: string | null | undefined): string | null {
    if (!html) return null;
    return sanitizeHtml(html, SANITIZE_OPTIONS);
  }
}
