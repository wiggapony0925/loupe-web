/**
 * Circle RBAC vocabulary.
 *
 * Roles answer "who runs this circle"; the JSONB `permissions` array answers
 * "what may this member see/do". OWNER and ADMIN short-circuit every check —
 * granular grants exist for MEMBER and VIEWER.
 */
import type { CircleRole } from '@prisma/client';

export const PERMISSIONS = ['VIEW_BALANCES', 'VIEW_TRANSACTIONS', 'EDIT_TAGS', 'ADMIN'] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const DEFAULT_MEMBER_PERMISSIONS: Permission[] = [
  'VIEW_BALANCES',
  'VIEW_TRANSACTIONS',
  'EDIT_TAGS',
];

export const DEFAULT_VIEWER_PERMISSIONS: Permission[] = ['VIEW_BALANCES'];

export interface MembershipLike {
  role: CircleRole;
  permissions: unknown; // Prisma Json column
}

/** Parses the JSONB column defensively — bad data degrades to "no grants". */
export function permissionsOf(member: MembershipLike): Permission[] {
  if (!Array.isArray(member.permissions)) return [];
  return member.permissions.filter(
    (p): p is Permission => typeof p === 'string' && (PERMISSIONS as readonly string[]).includes(p),
  );
}

export function hasPermission(member: MembershipLike, permission: Permission): boolean {
  if (member.role === 'OWNER' || member.role === 'ADMIN') return true;
  const grants = permissionsOf(member);
  return grants.includes('ADMIN') || grants.includes(permission);
}
