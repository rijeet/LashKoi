import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiBaseUrl } from './_api-base.js';
import { fetchIncidentSeoMeta, injectSeoIntoHtml } from '../src/lib/seo-meta.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = req.query.lang === 'bn' ? 'bn' : 'en';
  const slug = String(req.query.slug ?? '');
  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  const meta = await fetchIncidentSeoMeta(apiBaseUrl(), slug);

  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = req.headers.host ?? 'localhost';
  const indexUrl = `${proto}://${host}/index.html`;
  const htmlRes = await fetch(indexUrl);
  if (!htmlRes.ok) {
    res.status(502).send('Could not load app shell');
    return;
  }
  let html = await htmlRes.text();

  if (meta) {
    html = injectSeoIntoHtml(html, meta, lang);
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.send(html);
}
