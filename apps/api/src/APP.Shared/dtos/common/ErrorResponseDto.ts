import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorBodyDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code?: string;

  @ApiPropertyOptional({
    example: { email: ['email must be an email'] },
  })
  details?: unknown;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status!: 'error';

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ type: ErrorBodyDto })
  error?: ErrorBodyDto;
}
