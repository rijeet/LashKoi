import DOMPurify from 'isomorphic-dompurify';

export class HtmlSanitizeService {
  sanitize(html: string | null | undefined): string | null {
    if (!html) return null;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
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
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
    });
  }
}
