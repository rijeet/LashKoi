import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IncidentQueryService } from '@bll/services/incidents/IncidentQueryService';
import { BannerService } from '@bll/services/banners/BannerService';

@ApiTags('public')
@Controller()
export class PublicIncidentsController {
  constructor(
    private readonly incidents: IncidentQueryService,
    private readonly banners: BannerService,
  ) {}

  @Get('incident-types')
  @ApiOperation({ summary: 'Active incident types (legend + filters)' })
  @ApiQuery({ name: 'lang', required: false, example: 'en', enum: ['en', 'bn'] })
  listTypes(@Query('lang') lang?: string) {
    return this.incidents.listTypes(lang);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Map markers (GeoJSON FeatureCollection)' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({
    name: 'types',
    required: false,
    example: 'extortion,dengue',
    description: 'Comma-separated codes',
  })
  @ApiQuery({ name: 'division', required: false, example: 'BD30' })
  @ApiQuery({ name: 'district', required: false, example: 'BD3026' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2026-09-28',
    description: 'Asia/Dhaka calendar day',
  })
  @ApiQuery({ name: 'q', required: false, example: 'studio' })
  @ApiQuery({ name: 'format', required: false, example: 'geojson' })
  @ApiQuery({ name: 'limit', required: false, example: '500' })
  list(
    @Query() query: Record<string, string>,
    @Query('lang') lang?: string,
  ) {
    return this.incidents.listIncidentsGeoJson(query, lang);
  }

  @Get('incidents/days')
  @ApiOperation({ summary: 'Days with incidents (storyteller)' })
  @ApiQuery({ name: 'types', required: false, example: 'kidnap' })
  @ApiQuery({ name: 'division', required: false, example: 'BD30' })
  @ApiQuery({
    name: 'before',
    required: false,
    example: '2026-09-30',
    description: 'Exclusive Dhaka date',
  })
  @ApiQuery({ name: 'limit', required: false, example: '30' })
  days(@Query() query: Record<string, string>) {
    return this.incidents.listDays(query);
  }

  @Get('incidents/:slugOrId')
  @ApiOperation({ summary: 'Published incident detail' })
  @ApiParam({
    name: 'slugOrId',
    example: 'studio-vandalised-over-alleged-extortion-dispute',
  })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  detail(@Param('slugOrId') slugOrId: string, @Query('lang') lang?: string) {
    return this.incidents.getBySlug(slugOrId, lang);
  }

  @Get('featured-banners')
  @ApiOperation({ summary: 'Active featured / breaking banners' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'incidentId', required: false })
  featured(
    @Query('lang') lang?: string,
    @Query('incidentId') incidentId?: string,
  ) {
    return this.banners.listFeatured(lang, incidentId);
  }
}
