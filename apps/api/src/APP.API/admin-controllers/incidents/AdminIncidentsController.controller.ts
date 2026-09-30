import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';
import { IncidentAdminService } from '@bll/services/incidents/IncidentAdminService';
import { IncidentBulkImportService } from '@bll/services/incidents/import/IncidentBulkImportService';
import {
  CreateIncidentRequestDto,
  PatchIncidentRequestDto,
} from '@shared/dtos/incidents/CreateIncidentRequestDto';
import { BulkImportRequestDto } from '@shared/dtos/incidents/BulkImportRequestDto';

@ApiTags('admin-incidents')
@Controller('admin/incidents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminIncidentsController {
  constructor(
    private readonly incidents: IncidentAdminService,
    private readonly bulkImport: IncidentBulkImportService,
  ) {}

  @Post('bulk/normalize')
  @ApiOperation({ summary: 'Normalize bulk JSON for import (no writes)' })
  normalizeBulk(@Body() body: BulkImportRequestDto) {
    return this.bulkImport.normalizePayload(body);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Import incidents as drafts (bulk)' })
  importBulk(
    @Body() body: BulkImportRequestDto,
    @CurrentUser() user: ICurrentUser,
    @Query('dryRun') dryRun?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bulkImport.importBatch(body, user, {
      dryRun: dryRun === 'true' || dryRun === '1',
      idempotencyKey,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List incidents (admin)' })
  list(
    @Query('status') status?: string,
    @Query('types') types?: string,
    @Query('division') division?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('locationConfirmed') locationConfirmed?: string,
    @Query('importBatchId') importBatchId?: string,
  ) {
    return this.incidents.list({
      status,
      types,
      division,
      q,
      locationConfirmed,
      importBatchId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create draft incident' })
  @ApiBody({
    type: CreateIncidentRequestDto,
    examples: {
      extortionDhaka: {
        summary: 'Extortion — Dhaka (draft)',
        value: {
          type: 'extortion',
          titleEn: 'Studio vandalised over alleged extortion dispute',
          titleBn: 'চাঁদাবাজির অভিযোগে স্টুডিও ভাঙচুর',
          summaryEn:
            'Equipment damaged near ECB Chattar after an alleged extortion demand.',
          summaryBn: 'ইসিবি চত্ত্বরে সংক্ষিপ্ত বাংলা সারাংশ।',
          bodyHtml: '<p>Details for admin preview.</p>',
          placeNameEn: 'ECB Chattar, Dhaka',
          placeNameBn: 'ইসিবি চত্ত্বর, ঢাকা',
          location: { lat: 23.8223, lng: 90.3891 },
          divisionPcode: 'BD30',
          districtPcode: 'BD3026',
          upazilaPcode: null,
          unionPcode: null,
          sourceLabel: 'Arts & Entertainment Desk',
          sourceUrl: 'https://news.example.com/story/123',
          occurredAt: '2026-09-27T05:56:00.000Z',
          slug: null,
          bannerCaptionEn: 'Photos: Collected',
          bannerCaptionBn: null,
          caseCount: null,
          media: {
            image: 'https://cdn.example.com/incidents/sample.jpg',
            youtube: 'https://youtu.be/dQw4w9WgXcQ',
            facebook: null,
          },
        },
      },
    },
  })
  create(@Body() body: CreateIncidentRequestDto, @CurrentUser() user: ICurrentUser) {
    return this.incidents.create(body as unknown as Record<string, unknown>, user);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Audit history for incident' })
  @ApiParam({ name: 'id', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  audit(@Param('id') id: string) {
    return this.incidents.listAudit(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get incident (admin raw fields)' })
  @ApiParam({ name: 'id', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  get(@Param('id') id: string) {
    return this.incidents.getAdminRecord(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partial update' })
  @ApiBody({
    type: PatchIncidentRequestDto,
    examples: {
      updateSummary: {
        summary: 'Update summary + media',
        value: {
          summaryEn: 'Revised summary after editor review.',
          media: { image: 'https://cdn.example.com/incidents/updated.jpg' },
        },
      },
    },
  })
  patch(
    @Param('id') id: string,
    @Body() body: PatchIncidentRequestDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.incidents.patch(id, body as unknown as Record<string, unknown>, user);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish incident',
    description: 'Requires image or summary. Sets status=published.',
  })
  publish(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.incidents.publish(id, user);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Revert incident to draft (hidden on public map)' })
  unpublish(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.incidents.unpublish(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete incident' })
  remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.incidents.softDelete(id, user);
  }
}
