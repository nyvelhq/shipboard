import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Marks a route as requiring one of the given WorkspaceMember roles.
// Must be paired with RolesGuard, and only works on routes that already
// run WorkspaceMembershipGuard first (it reads request.membership, which
// that guard is what sets).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
