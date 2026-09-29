import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StatsAnalyticsService } from '@bll/services/stats/StatsAnalyticsService';
import { IncidentQueryService } from '@bll/services/incidents/IncidentQueryService';

@ApiTags('public')
@Controller()
export class StatsController {
  constructor(
    private readonly stats: StatsAnalyticsService,
    private readonly incidents: IncidentQueryService,
  ) {}

  @Get('stats/summary')
  @ApiOperation({ summary: 'Totals per type (splash counters)' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO occurred_at lower bound' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO occurred_at upper bound' })
  summary(
    @Query('lang') lang?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.incidents.statsSummary(lang, { from, to });
  }

  @Get('stats/health-districts')
  @ApiOperation({
    summary: 'Health case totals by district (choropleth)',
    description: 'Sums case_count (or 1 per incident) for dengue/measles over a date window.',
  })
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'type', required: false, example: 'dengue' })
  @ApiQuery({ name: 'types', required: false, example: 'dengue,measles' })
  @ApiQuery({ name: 'division', required: false, example: 'BD30' })
  @ApiQuery({ name: 'days', required: false, example: '30' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  healthDistricts(
    @Query() query: Record<string, string>,
    @Query('lang') lang?: string,
  ) {
    return this.stats.healthByDistrict(query, lang);
  }
}
