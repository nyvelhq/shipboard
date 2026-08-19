import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Must run after WorkspaceMembershipGuard — it reads request.membership,
 * which that guard sets. Routes with no @Roles() metadata pass through
 * unchanged (membership alone is enough), matching every other endpoint
 * in the app that doesn't need elevated access.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: string | undefined = request.membership?.role;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('This action requires admin or owner access.');
    }
    return true;
  }
}
