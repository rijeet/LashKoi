import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appEnvSchema } from '@infra/config/AppEnvSchema.schema';
import { ApiConfigService } from '@infra/config/layer-configs/ApiConfig.service';
import { SecurityConfigService } from '@infra/config/layer-configs/SecurityConfig.service';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { IncidentTypes } from '@entity/entities/IncidentTypes.entity';
import { AdminAreas } from '@entity/entities/AdminAreas.entity';
import { Incidents } from '@entity/entities/Incidents.entity';
import { IncidentMedia } from '@entity/entities/IncidentMedia.entity';
import { FeatureBanners } from '@entity/entities/FeatureBanners.entity';
import { IncidentAudit } from '@entity/entities/IncidentAudit.entity';
import { ImportBatches } from '@entity/entities/ImportBatches.entity';
import { ImportProfiles } from '@entity/entities/ImportProfiles.entity';
import { JwtService } from '@infra/security/JwtService.service';
import { PasswordHasherService } from '@infra/security/PasswordHasher.service';
import { RevocationRegistryService } from '@infra/security/RevocationRegistry.service';
import { CacheService } from '@infra/redis/CacheService.service';
import {
  IJwtService,
  IPasswordHasher,
  IRevocationRegistry,
  ICacheService,
} from '@shared/tokens/injection.tokens';

const entities = [
  SysUsers,
  UserSessions,
  IncidentTypes,
  AdminAreas,
  Incidents,
  IncidentMedia,
  FeatureBanners,
  IncidentAudit,
  ImportBatches,
  ImportProfiles,
];

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: appEnvSchema,
      validationOptions: { allowUnknown: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities,
        synchronize: false,
        logging: config.get('DATABASE_LOGGING') === 'true',
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    ApiConfigService,
    SecurityConfigService,
    AppDbContext,
    { provide: IJwtService, useClass: JwtService },
    { provide: IPasswordHasher, useClass: PasswordHasherService },
    { provide: IRevocationRegistry, useClass: RevocationRegistryService },
    { provide: ICacheService, useClass: CacheService },
    JwtService,
    PasswordHasherService,
    RevocationRegistryService,
    CacheService,
  ],
  exports: [
    ApiConfigService,
    SecurityConfigService,
    AppDbContext,
    IJwtService,
    IPasswordHasher,
    IRevocationRegistry,
    ICacheService,
    CacheService,
    TypeOrmModule,
  ],
})
export class InfrastructureModule {}
