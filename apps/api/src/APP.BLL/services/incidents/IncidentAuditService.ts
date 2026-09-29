import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';

export type IncidentAuditAction =
  | 'created'
  | 'updated'
  | 'published'
  | 'unpublished'
  | 'deleted';

@Injectable()
export class IncidentAuditService {
  constructor(private readonly db: AppDbContext) {}

  async log(
    incidentId: string,
    action: IncidentAuditAction,
    user: ICurrentUser | null,
    diff?: Record<string, unknown> | null,
  ) {
    await this.db.incidentAudit.save(
      this.db.incidentAudit.create({
        incidentId,
        userId: user?.userId ?? null,
        action,
        diff: diff ?? null,
      }),
    );
  }

  async listForIncident(incidentId: string, limit = 50) {
    const rows = await this.db.incidentAudit.find({
      where: { incidentId },
      order: { at: 'DESC' },
      take: Math.min(limit, 100),
    });
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
    const users =
      userIds.length
        ? await this.db.users
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: userIds })
            .getMany()
        : [];
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      at: r.at,
      diff: r.diff,
      user: r.userId
        ? { id: r.userId, email: emailById.get(r.userId) ?? null }
        : null,
    }));
  }
}
