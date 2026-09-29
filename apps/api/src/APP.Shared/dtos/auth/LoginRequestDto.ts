import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Admin account email (seeded via ADMIN_EMAIL)',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'ChangeMe123!',
    description: 'Min 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
