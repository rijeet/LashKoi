import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

export class ApiHttpException extends HttpException {
  constructor(
    status: HttpStatus,
    message: string,
    code: ErrorCode,
    details?: unknown,
  ) {
    super(
      {
        message,
        error: { code, details },
      },
      status,
    );
  }
}
