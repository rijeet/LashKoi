import { Module } from '@nestjs/common';
import { LoginService } from '@bll/services/auth/LoginService';
import { SessionService } from '@bll/services/auth/SessionService';
import { TokenService } from '@bll/services/auth/TokenService';
import { IncidentQueryService } from '@bll/services/incidents/IncidentQueryService';
import { IncidentAdminService } from '@bll/services/incidents/IncidentAdminService';
import { BoundaryService } from '@bll/services/boundaries/BoundaryService';
import { SeoService } from '@bll/services/seo/SeoService';
import { BannerService } from '@bll/services/banners/BannerService';
import { BannerAdminService } from '@bll/services/banners/BannerAdminService';
import { DistrictBoundaryValidationService } from '@bll/services/boundaries/DistrictBoundaryValidationService';
import { IncidentAuditService } from '@bll/services/incidents/IncidentAuditService';
import { GovernanceTrackerService } from '@bll/services/governance/GovernanceTrackerService';
import { StatsAnalyticsService } from '@bll/services/stats/StatsAnalyticsService';
import { IncidentImportNormalizerService } from '@bll/services/incidents/import/IncidentImportNormalizerService';
import { IncidentBulkImportService } from '@bll/services/incidents/import/IncidentBulkImportService';

@Module({
  providers: [
    LoginService,
    SessionService,
    TokenService,
    IncidentQueryService,
    IncidentAdminService,
    BoundaryService,
    SeoService,
    BannerService,
    BannerAdminService,
    DistrictBoundaryValidationService,
    IncidentAuditService,
    GovernanceTrackerService,
    StatsAnalyticsService,
    IncidentImportNormalizerService,
    IncidentBulkImportService,
  ],
  exports: [
    LoginService,
    SessionService,
    TokenService,
    IncidentQueryService,
    IncidentAdminService,
    BoundaryService,
    SeoService,
    BannerService,
    BannerAdminService,
    DistrictBoundaryValidationService,
    IncidentAuditService,
    GovernanceTrackerService,
    StatsAnalyticsService,
    IncidentImportNormalizerService,
    IncidentBulkImportService,
  ],
})
export class BllModule {}
