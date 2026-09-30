import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let server: Express | null = null;

async function ensureServer(): Promise<Express> {
  if (server) return server;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../load-env.js');
  const { createNestApp, getExpressApp } = await import('../dist/bootstrap.js');
  await createNestApp();
  server = getExpressApp();
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await ensureServer();
  return app(req, res);
}
