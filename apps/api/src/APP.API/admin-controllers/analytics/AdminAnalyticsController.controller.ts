import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { StatsAnalyticsService } from '@bll/services/stats/StatsAnalyticsService';

@ApiTags('admin-analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminAnalyticsController {
  constructor(private readonly stats: StatsAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Incident analytics dashboard (last N days)' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'days', required: false, example: '30' })
  overview(@Query() query: Record<string, string>, @Query('lang') lang?: string) {
    return this.stats.analyticsOverview(query, lang);
  }
}
