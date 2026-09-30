import * as cheerio from 'cheerio';

export type ExtractedArticle = {
  title: string;
  description: string;
  image?: string;
  publishedAt?: string;
  extractor: 'jsonld' | 'og' | 'dom';
};

export function extractArticle(html: string): ExtractedArticle {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();
  for (const raw of scripts) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const node = Array.isArray(data['@graph'])
        ? (data['@graph'] as Record<string, unknown>[]).find(
            (n) => n['@type'] === 'NewsArticle',
          )
        : data['@type'] === 'NewsArticle'
          ? data
          : null;
      if (node) {
        const headline = String(node.headline ?? '');
        const desc = String(node.description ?? '');
        const date = String(node.datePublished ?? node.dateModified ?? '');
        const image =
          typeof node.image === 'string'
            ? node.image
            : Array.isArray(node.image)
              ? String((node.image[0] as { url?: string })?.url ?? '')
              : String((node.image as { url?: string })?.url ?? '');
        if (headline) {
          return {
            title: headline,
            description: desc.slice(0, 300),
            image: image || undefined,
            publishedAt: date || undefined,
            extractor: 'jsonld',
          };
        }
      }
    } catch {
      /* try next */
    }
  }

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const pub = $('meta[property="article:published_time"]').attr('content');
  if (ogTitle) {
    return {
      title: ogTitle,
      description: (ogDesc ?? '').slice(0, 300),
      image: ogImage,
      publishedAt: pub,
      extractor: 'og',
    };
  }

  const h1 = $('h1').first().text().trim();
  const lead = $('p').first().text().trim().slice(0, 300);
  return {
    title: h1 || 'Untitled',
    description: lead,
    extractor: 'dom',
  };
}
