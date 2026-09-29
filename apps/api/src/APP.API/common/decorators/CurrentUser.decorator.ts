import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ICurrentUser } from '@shared/interfaces/domain/ICurrentUser.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ICurrentUser => {
    const req = ctx.switchToHttp().getRequest<{ user: ICurrentUser }>();
    return req.user;
  },
);
