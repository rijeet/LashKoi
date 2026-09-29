import { Injectable } from '@nestjs/common';

interface RevokedSession {
  sessionId: string;
  userId: string;
  revokedAt: number;
}

@Injectable()
export class RevocationRegistryService {
  private readonly revoked = new Map<string, RevokedSession>();

  revokeSession(sessionId: string, userId: string): void {
    this.revoked.set(sessionId, {
      sessionId,
      userId,
      revokedAt: Date.now(),
    });
  }

  revokeAllForUser(userId: string, sessionIds: string[]): void {
    for (const sid of sessionIds) {
      this.revokeSession(sid, userId);
    }
  }

  isRevoked(sessionId: string): boolean {
    return this.revoked.has(sessionId);
  }
}
