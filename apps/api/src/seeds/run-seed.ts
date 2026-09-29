import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import AppDataSource from '@infra/db/typeorm/AppDataSource.datasource';
import { IncidentTypes } from '@entity/entities/IncidentTypes.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import * as bcrypt from 'bcrypt';

const root = path.resolve(__dirname, '../..');
dotenvConfig({ path: path.join(root, '.env.local') });
dotenvConfig({ path: path.join(root, '.env') });

async function main() {
  await AppDataSource.initialize();
  const typesPath = path.resolve(root, '../../config/incident-types.seed.json');
  const seedJson = JSON.parse(fs.readFileSync(typesPath, 'utf8')) as {
    incidentTypes: Array<Record<string, unknown>>;
  };

  const typeRepo = AppDataSource.getRepository(IncidentTypes);
  for (const t of seedJson.incidentTypes) {
    const existing = await typeRepo.findOne({ where: { code: String(t.code) } });
    if (existing) continue;
    await typeRepo.save(
      typeRepo.create({
        code: String(t.code),
        labelEn: String(t.labelEn),
        labelBn: String(t.labelBn),
        iconKey: String(t.iconKey),
        iconUrl: (t.iconUrl as string) ?? null,
        markerColor: String(t.markerColor),
        isHealth: Boolean(t.isHealth),
        contentWarning: Boolean(t.contentWarning),
        sortOrder: Number(t.sortOrder),
        isActive: Boolean(t.isActive),
      }),
    );
  }

  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const userRepo = AppDataSource.getRepository(SysUsers);
  const admin = await userRepo.findOne({ where: { email } });
  if (!admin) {
    const hash = await bcrypt.hash(password, 12);
    await userRepo.save(
      userRepo.create({
        email,
        passwordHash: hash,
        role: 'admin',
        isActive: true,
      }),
    );
    console.log(`Admin user created: ${email}`);
  } else {
    console.log(`Admin user exists: ${email}`);
  }

  await AppDataSource.destroy();
  console.log('Seed complete. Run npm run seed:areas to load boundaries.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
