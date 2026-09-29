import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { IncidentTypes } from '@entity/entities/IncidentTypes.entity';
import { AdminAreas } from '@entity/entities/AdminAreas.entity';
import { Incidents } from '@entity/entities/Incidents.entity';
import { IncidentMedia } from '@entity/entities/IncidentMedia.entity';
import { FeatureBanners } from '@entity/entities/FeatureBanners.entity';
import { IncidentAudit } from '@entity/entities/IncidentAudit.entity';

@Injectable()
export class AppDbContext {
  constructor(
    @InjectRepository(SysUsers) public readonly users: Repository<SysUsers>,
    @InjectRepository(UserSessions)
    public readonly userSessions: Repository<UserSessions>,
    @InjectRepository(IncidentTypes)
    public readonly incidentTypes: Repository<IncidentTypes>,
    @InjectRepository(AdminAreas) public readonly adminAreas: Repository<AdminAreas>,
    @InjectRepository(Incidents) public readonly incidents: Repository<Incidents>,
    @InjectRepository(IncidentMedia)
    public readonly incidentMedia: Repository<IncidentMedia>,
    @InjectRepository(FeatureBanners)
    public readonly featureBanners: Repository<FeatureBanners>,
    @InjectRepository(IncidentAudit)
    public readonly incidentAudit: Repository<IncidentAudit>,
    private readonly entityManager: EntityManager,
  ) {}

  async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.entityManager.transaction(work);
  }
}
