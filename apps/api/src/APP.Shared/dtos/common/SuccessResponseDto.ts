import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto<T = unknown> {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ description: 'Endpoint-specific payload' })
  data!: T;
}
