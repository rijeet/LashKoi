import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GovernanceTrackerService } from '@bll/services/governance/GovernanceTrackerService';
import { PartnerApiKeyGuard } from '@api/common/guards/PartnerApiKeyGuard.guard';

@ApiTags('partner')
@Controller('governance')
@UseGuards(PartnerApiKeyGuard)
export class GovernanceTrackerController {
  constructor(private readonly governance: GovernanceTrackerService) {}

  @Get('tracker')
  @ApiOperation({
    summary: 'Partner bundle (types, latest incidents, banners)',
    description:
      'BDCP-style widget feed. Optional GOVERNANCE_PARTNER_KEY → send X-Partner-Key header.',
  })
  @ApiHeader({
    name: 'X-Partner-Key',
    required: false,
    description: 'Required when GOVERNANCE_PARTNER_KEY is set on the API',
  })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'bn'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'bn'] })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Incident type code (alias: type)',
    example: 'extortion',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Trigram search' })
  @ApiQuery({ name: 'incidentLimit', required: false, example: '12' })
  getTracker(@Query() query: Record<string, string>) {
    return this.governance.getTracker(query);
  }
}
