import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiConfigService } from '@infra/config/layer-configs/ApiConfig.service';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly apiConfig: ApiConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.apiConfig.governancePartnerKey;
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-partner-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (key && key === required) return true;

    throw new UnauthorizedException({
      message: 'Invalid or missing partner API key',
      error: { code: ErrorCode.UNAUTHORIZED },
    });
  }
}
