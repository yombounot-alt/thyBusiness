import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../types/auth.types';

/**
 * The active business id, sourced only from the verified JWT claim — never from route
 * params/body/query. Pair with BusinessContextGuard, which rejects requests where this is null
 * before the controller method runs.
 */
export const CurrentBusiness = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user.businessId as string;
  },
);
