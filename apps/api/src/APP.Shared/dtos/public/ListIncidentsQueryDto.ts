import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ example: 'en', enum: ['en', 'bn'] })
  @IsOptional()
  @IsIn(['en', 'bn'])
  lang?: string;

  @ApiPropertyOptional({
    example: 'extortion,kidnap',
    description: 'Comma-separated incident type codes',
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({ example: 'BD30', description: 'Division P-code' })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiPropertyOptional({ example: 'BD3026' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Asia/Dhaka calendar day' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'dhaka studio' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'geojson', enum: ['geojson', 'json'] })
  @IsOptional()
  @IsIn(['geojson', 'json'])
  format?: string;

  @ApiPropertyOptional({ example: 500, default: 500 })
  @IsOptional()
  @IsString()
  limit?: string;
}
