import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: ErrorCode = ErrorCode.DOMAIN_ERROR;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const obj = payload as {
          message?: string | string[];
          error?: { code?: string; details?: unknown };
        };
        message = Array.isArray(obj.message)
          ? obj.message.join(', ')
          : (obj.message ?? exception.message);
        if (obj.error?.code) {
          code = obj.error.code as ErrorCode;
        }
        details = obj.error?.details;
      }
    }

    if (exception instanceof ApiHttpException) {
      status = exception.getStatus();
    }

    if (status === HttpStatus.BAD_REQUEST && code === ErrorCode.DOMAIN_ERROR) {
      code = ErrorCode.VALIDATION_ERROR;
    }

    const body = new ErrorResponseDto();
    body.status = 'error';
    body.message = message;
    body.statusCode = status;
    body.error = { code, details };

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      res.setHeader('Retry-After', '60');
    }

    res.status(status).json(body);
  }
}
