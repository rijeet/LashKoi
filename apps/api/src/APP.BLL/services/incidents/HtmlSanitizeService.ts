import { FilterXSS } from 'xss';

/** CJS-safe HTML whitelist (Vercel serverless — no jsdom / ESM htmlparser2). */
const HTML_WHITE_LIST: Record<string, string[]> = {
  p: [],
  h2: [],
  h3: [],
  h4: [],
  strong: [],
  em: [],
  a: ['href', 'title', 'target', 'rel'],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  img: ['src', 'alt', 'title'],
  figure: [],
  figcaption: [],
  article: [],
};

const xssFilter = new FilterXSS({
  whiteList: HTML_WHITE_LIST,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

export class HtmlSanitizeService {
  sanitize(html: string | null | undefined): string | null {
    if (!html) return null;
    return xssFilter.process(html);
  }
}
