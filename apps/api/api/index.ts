import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

let server: Express | null = null;
let booting: Promise<Express> | null = null;

function loadLocalEnvOptional(): void {
  const loadEnvPath = path.join(__dirname, '..', 'load-env.js');
  if (fs.existsSync(loadEnvPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(loadEnvPath);
  }
}

type BootstrapModule = {
  createNestApp: () => Promise<unknown>;
  getExpressApp: () => Express;
};

async function ensureServer(): Promise<Express> {
  if (server) return server;
  if (!booting) {
    booting = (async () => {
      loadLocalEnvOptional();
      // Static path so Vercel file tracing includes dist + node_modules deps
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../dist/bootstrap.js') as BootstrapModule;
      await mod.createNestApp();
      server = mod.getExpressApp();
      return server;
    })();
  }
  return booting;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await ensureServer();
    await new Promise<void>((resolve, reject) => {
      res.on('finish', () => resolve());
      res.on('close', () => resolve());
      app(req, res, (err: unknown) => {
        if (err) reject(err);
      });
    });
  } catch (err) {
    console.error('[lashkoi-api]', err);
    if (!res.headersSent) {
      const message =
        err instanceof Error ? err.message : 'Server failed to start';
      res.status(500).json({
        statusCode: 500,
        message,
        hint:
          'Check Vercel env: DATABASE_URL, JWT_SECRET, CORS_ORIGINS (see docs/env_backend.md)',
      });
    }
  }
}
