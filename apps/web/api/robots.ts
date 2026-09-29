import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiBaseUrl } from './_api-base';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const upstream = await fetch(`${apiBaseUrl()}/robots.txt`);
  const body = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.send(body);
}
