import { AuthUser, Role } from '@factorymatch/shared';

/**
 * Determines if a user can create shortlists (Admin matching).
 */
export function canCreateShortlist(user: AuthUser): boolean {
  return user.role === Role.ADMIN;
}

/**
 * Determines if a user can view a shortlist for a brief.
 * - Admin sees all.
 * - Brand sees shortlist only for briefs they own.
 */
export function canViewShortlist(
  user: AuthUser,
  brief: { brandId: string },
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.BRAND && user.brandId) {
    return user.brandId === brief.brandId;
  }

  return false;
}
