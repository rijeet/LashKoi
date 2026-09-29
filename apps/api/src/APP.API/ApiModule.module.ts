import { Module } from '@nestjs/common';
import { BllModule } from '@bll/BllModule.module';
import { ResponseInterceptor } from '@api/common/interceptors/ResponseInterceptor.interceptor';
import { HealthController } from '@api/feature-controllers/health/HealthController.controller';
import { AdminAuthController } from '@api/admin-controllers/auth/AdminAuthController.controller';
import { PublicIncidentsController } from '@api/feature-controllers/incidents/PublicIncidentsController.controller';
import { BoundariesController } from '@api/feature-controllers/boundaries/BoundariesController.controller';
import { SeoController } from '@api/feature-controllers/seo/SeoController.controller';
import { AdminIncidentsController } from '@api/admin-controllers/incidents/AdminIncidentsController.controller';
import { AdminBannersController } from '@api/admin-controllers/banners/AdminBannersController.controller';
import { GovernanceTrackerController } from '@api/feature-controllers/governance/GovernanceTrackerController.controller';
import { PartnerApiKeyGuard } from '@api/common/guards/PartnerApiKeyGuard.guard';
import { StatsController } from '@api/feature-controllers/stats/StatsController.controller';
import { AdminAnalyticsController } from '@api/admin-controllers/analytics/AdminAnalyticsController.controller';

@Module({
  imports: [BllModule],
  controllers: [
    HealthController,
    AdminAuthController,
    PublicIncidentsController,
    BoundariesController,
    SeoController,
    AdminIncidentsController,
    AdminBannersController,
    GovernanceTrackerController,
    StatsController,
    AdminAnalyticsController,
  ],
  providers: [ResponseInterceptor, PartnerApiKeyGuard],
  exports: [ResponseInterceptor],
})
export class ApiModule {}
