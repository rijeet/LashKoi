import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly memory = new Map<string, { value: string; expires: number }>();

  constructor(private readonly config: ConfigService) {}

  private get upstashConfigured(): boolean {
    return Boolean(
      this.config.get('UPSTASH_REDIS_REST_URL') &&
        this.config.get('UPSTASH_REDIS_REST_TOKEN'),
    );
  }

  async get(key: string): Promise<string | null> {
    const mem = this.memory.get(key);
    if (mem && mem.expires > Date.now()) {
      return mem.value;
    }
    if (!this.upstashConfigured) {
      return null;
    }
    const url = this.config.get<string>('UPSTASH_REDIS_REST_URL')!;
    const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN')!;
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    return json.result ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    if (!this.upstashConfigured) return;
    const url = this.config.get<string>('UPSTASH_REDIS_REST_URL')!;
    const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN')!;
    await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Clears in-process cache entries (e.g. after publish). Upstash TTL handles remote expiry. */
  clearMemoryByPrefix(prefix: string): void {
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
  }

  async ping(): Promise<boolean> {
    if (!this.upstashConfigured) return true;
    try {
      const url = this.config.get<string>('UPSTASH_REDIS_REST_URL')!;
      const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN')!;
      const res = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
