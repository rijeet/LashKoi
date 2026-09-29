import { createHash } from 'crypto';

export function digestRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
