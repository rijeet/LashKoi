import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RawResponse } from '@api/common/decorators/RawResponse.decorator';
import { CacheService } from '@infra/redis/CacheService.service';

@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  @Get('health')
  @RawResponse()
  async health() {
    let db = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    const redis = (await this.cache.ping()) ? 'up' : 'down';
    return { ok: db === 'up', db, redis };
  }
}
