import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class BulkImportRequestDto {
  @ApiPropertyOptional({ description: 'Raw file contents (JSON array or JSONL)' })
  @IsOptional()
  @IsString()
  raw?: string;

  @ApiPropertyOptional({ enum: ['json', 'jsonl'] })
  @IsOptional()
  @IsIn(['json', 'jsonl'])
  format?: 'json' | 'jsonl';

  @ApiPropertyOptional({ description: 'Pre-parsed incident rows' })
  @IsOptional()
  @IsArray()
  incidents?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ enum: ['cli', 'ui'] })
  @IsOptional()
  @IsIn(['cli', 'ui'])
  source?: 'cli' | 'ui';

  @ApiPropertyOptional({
    description: 'Row indices to import (default: all valid rows)',
  })
  @IsOptional()
  @IsArray()
  indices?: number[];
}
