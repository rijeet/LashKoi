import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { IncidentTypes } from '@entity/entities/IncidentTypes.entity';
import { AdminAreas } from '@entity/entities/AdminAreas.entity';
import { Incidents } from '@entity/entities/Incidents.entity';
import { IncidentMedia } from '@entity/entities/IncidentMedia.entity';
import { FeatureBanners } from '@entity/entities/FeatureBanners.entity';
import { IncidentAudit } from '@entity/entities/IncidentAudit.entity';

const projectRoot = path.resolve(__dirname, '../../../..');
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenvConfig({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in apps/api/.env.local');
}

const migrationPath = path.join(projectRoot, 'migrations', '*.ts');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [
    SysUsers,
    UserSessions,
    IncidentTypes,
    AdminAreas,
    Incidents,
    IncidentMedia,
    FeatureBanners,
    IncidentAudit,
  ],
  migrations: [migrationPath],
});

export default AppDataSource;
