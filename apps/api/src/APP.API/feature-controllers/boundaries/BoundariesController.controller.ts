import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BoundaryService } from '@bll/services/boundaries/BoundaryService';

@ApiTags('boundaries')
@Controller('boundaries')
export class BoundariesController {
  constructor(private readonly boundaries: BoundaryService) {}

  @Get('divisions')
  @ApiOperation({ summary: 'All divisions' })
  @ApiQuery({ name: 'lang', required: false, example: 'en', enum: ['en', 'bn'] })
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
  divisions(@Query('lang') lang?: string) {
    return this.boundaries.listDivisions(lang);
  }

  @Get('divisions/:divisionPcode/districts')
  @ApiOperation({ summary: 'Districts in a division' })
  @ApiParam({ name: 'divisionPcode', example: 'BD30', description: 'Dhaka' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
  districts(
    @Param('divisionPcode') divisionPcode: string,
    @Query('lang') lang?: string,
  ) {
    return this.boundaries.listDistricts(divisionPcode, lang);
  }

  @Get('districts/:districtPcode/upazilas')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
  upazilas(
    @Param('districtPcode') districtPcode: string,
    @Query('lang') lang?: string,
  ) {
    return this.boundaries.listUpazilas(districtPcode, lang);
  }

  @Get('upazilas/:upazilaPcode/unions')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
  unions(
    @Param('upazilaPcode') upazilaPcode: string,
    @Query('lang') lang?: string,
  ) {
    return this.boundaries.listUnions(upazilaPcode, lang);
  }

  @Get(':pcode')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
  byPcode(@Param('pcode') pcode: string, @Query('lang') lang?: string) {
    return this.boundaries.getByPcode(pcode, lang);
  }
}
