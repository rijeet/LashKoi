import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { LoginService } from '@bll/services/auth/LoginService';
import { SessionService } from '@bll/services/auth/SessionService';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import {
  AuthLoginResponseDto,
  TokenRefreshResponseDto,
} from '@shared/dtos/auth/AuthLoginResponseDto';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';
import { ApiEnvelopeResponse } from '@api/common/swagger/api-envelope.decorator';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly loginService: LoginService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Admin login',
    description:
      'Returns access + refresh tokens. Store refresh token in sessionStorage (`lk_refresh_token`). No cookies (D1).',
  })
  @ApiBody({
    type: LoginRequestDto,
    examples: {
      localAdmin: {
        summary: 'Seeded admin',
        description: 'Matches ADMIN_EMAIL / ADMIN_PASSWORD from `.env.local` after `npm run api:seed`',
        value: {
          email: 'admin@example.com',
          password: 'ChangeMe123!',
        },
      },
    },
  })
  @ApiEnvelopeResponse(AuthLoginResponseDto, 201)
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async login(@Body() dto: LoginRequestDto, @Req() req: Request) {
    return this.loginService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh token',
    description:
      'Send **refresh** JWT as `Authorization: Bearer <refresh_token>`. Returns new access + refresh pair.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <refresh_token>',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiEnvelopeResponse(TokenRefreshResponseDto)
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async refresh(@Headers('authorization') auth?: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    return this.sessionService.refresh(token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiHeader({
    name: 'X-Refresh-Token',
    required: false,
    description: 'Optional refresh token to revoke explicitly',
  })
  async logout(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-refresh-token') refresh?: string,
  ) {
    await this.sessionService.logout(user.sessionId, user.userId, refresh);
    return { ok: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke all sessions for this admin' })
  async logoutAll(@CurrentUser() user: ICurrentUser) {
    await this.sessionService.logoutAll(user.userId);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current admin profile' })
  me(@CurrentUser() user: ICurrentUser) {
    return { id: user.userId, email: user.email, role: user.role };
  }
}
