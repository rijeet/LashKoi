import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { BannerAdminService } from '@bll/services/banners/BannerAdminService';

@ApiTags('admin-banners')
@Controller('admin/banners')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminBannersController {
  constructor(private readonly banners: BannerAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List featured banners (admin)' })
  list() {
    return this.banners.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create banner' })
  create(@Body() body: Record<string, unknown>) {
    return this.banners.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update banner' })
  patch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.banners.patch(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete banner' })
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
