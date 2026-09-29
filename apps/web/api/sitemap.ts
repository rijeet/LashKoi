import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiBaseUrl } from './_api-base';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const upstream = await fetch(`${apiBaseUrl()}/sitemap.xml`);
  const body = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.send(body);
}
