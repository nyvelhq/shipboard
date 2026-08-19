export const ELEVATED_ROLES = ['owner', 'admin'];

export function isElevatedRole(role: string): boolean {
  return ELEVATED_ROLES.includes(role);
}
