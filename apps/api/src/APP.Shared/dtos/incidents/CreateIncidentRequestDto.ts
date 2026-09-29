import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IncidentLocationDto {
  @ApiProperty({ example: 23.8223, description: 'Latitude (WGS84)' })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 90.3891, description: 'Longitude (WGS84)' })
  @IsNumber()
  lng!: number;
}

export class IncidentMediaDto {
  @ApiPropertyOptional({
    example: 'https://cdn.example.com/incidents/studio-vandalised.jpg',
  })
  @IsOptional()
  @IsUrl()
  image?: string | null;

  @ApiPropertyOptional({ example: 'https://youtu.be/dQw4w9WgXcQ' })
  @IsOptional()
  @IsUrl()
  youtube?: string | null;

  @ApiPropertyOptional({
    example: 'https://www.facebook.com/watch/?v=123456789',
  })
  @IsOptional()
  @IsUrl()
  facebook?: string | null;
}

export class CreateIncidentRequestDto {
  @ApiProperty({ example: 'extortion', enum: ['extortion', 'measles', 'kidnap', 'dengue'] })
  @IsString()
  type!: string;

  @ApiProperty({
    example: 'Studio vandalised over alleged extortion dispute',
  })
  @IsString()
  @MinLength(3)
  titleEn!: string;

  @ApiPropertyOptional({ example: 'চাঁদাবাজির অভিযোগে স্টুডিও ভাঙচুর' })
  @IsOptional()
  @IsString()
  titleBn?: string;

  @ApiProperty({
    example:
      'Local artists say a group demanded money before damaging equipment near ECB Chattar.',
  })
  @IsString()
  summaryEn!: string;

  @ApiPropertyOptional({ example: 'সংক্ষিপ্ত বাংলা সারাংশ…' })
  @IsOptional()
  @IsString()
  summaryBn?: string;

  @ApiPropertyOptional({
    example: '<p>Full HTML body (sanitized on save).</p>',
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({ example: 'ECB Chattar, Dhaka' })
  @IsOptional()
  @IsString()
  placeNameEn?: string;

  @ApiPropertyOptional({ example: 'ইসিবি চত্ত্বর, ঢাকা' })
  @IsOptional()
  @IsString()
  placeNameBn?: string;

  @ApiProperty({ type: IncidentLocationDto })
  @ValidateNested()
  @Type(() => IncidentLocationDto)
  location!: IncidentLocationDto;

  @ApiProperty({ example: 'BD30', description: 'Dhaka division P-code' })
  @IsString()
  divisionPcode!: string;

  @ApiProperty({ example: 'BD3026', description: 'Dhaka district P-code' })
  @IsString()
  districtPcode!: string;

  @ApiPropertyOptional({ example: 'BD302602' })
  @IsOptional()
  @IsString()
  upazilaPcode?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  unionPcode?: string | null;

  @ApiProperty({ example: 'Arts & Entertainment Desk' })
  @IsString()
  sourceLabel!: string;

  @ApiPropertyOptional({ example: 'https://news.example.com/story/123' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiProperty({ example: '2026-09-27T05:56:00.000Z' })
  @IsISO8601()
  occurredAt!: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Auto-generated from titleEn when omitted',
  })
  @IsOptional()
  @IsString()
  slug?: string | null;

  @ApiPropertyOptional({ example: 'Photos: Collected' })
  @IsOptional()
  @IsString()
  bannerCaptionEn?: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  bannerCaptionBn?: string | null;

  @ApiPropertyOptional({ example: null, description: 'Health types only' })
  @IsOptional()
  @IsInt()
  caseCount?: number | null;

  @ApiPropertyOptional({ type: IncidentMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncidentMediaDto)
  media?: IncidentMediaDto;
}

export class PatchIncidentRequestDto {
  @ApiPropertyOptional({ example: 'extortion' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Updated headline in English' })
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleBn?: string;

  @ApiPropertyOptional({ example: 'Updated summary' })
  @IsOptional()
  @IsString()
  summaryEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summaryBn?: string;

  @ApiPropertyOptional({ example: '<p>Updated body</p>' })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeNameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeNameBn?: string;

  @ApiPropertyOptional({ type: IncidentLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncidentLocationDto)
  location?: IncidentLocationDto;

  @ApiPropertyOptional({ example: 'BD30' })
  @IsOptional()
  @IsString()
  divisionPcode?: string;

  @ApiPropertyOptional({ example: 'BD3026' })
  @IsOptional()
  @IsString()
  districtPcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upazilaPcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unionPcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ example: '2026-09-28T10:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional({ type: IncidentMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncidentMediaDto)
  media?: IncidentMediaDto;
}
