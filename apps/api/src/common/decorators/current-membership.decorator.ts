import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkspaceMember } from '@prisma/client';

// Set by WorkspaceMembershipGuard, which must run first on the route.
export const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): WorkspaceMember => {
    const request = ctx.switchToHttp().getRequest();
    return request.membership;
  },
);
