import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { RAW_RESPONSE_KEY } from '@api/common/decorators/RawResponse.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        if (data instanceof SuccessResponseDto) return data;
        const success = new SuccessResponseDto();
        success.status = 'success';
        success.message = 'Operation completed successfully';
        success.statusCode = statusCode;
        success.data = data ?? {};
        return success;
      }),
    );
  }
}
