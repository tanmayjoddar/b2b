import { AuthUser, BriefStatus, Role } from '@factorymatch/shared';

/**
 * State machine for Brief status transitions.
 * DRAFT → SUBMITTED → MATCHING → SHORTLISTED → QUOTING → CLOSED (or CANCELLED from any non-terminal).
 */
export const BRIEF_TRANSITIONS: Record<BriefStatus, BriefStatus[]> = {
  [BriefStatus.DRAFT]: [BriefStatus.SUBMITTED, BriefStatus.CANCELLED],
  [BriefStatus.SUBMITTED]: [BriefStatus.MATCHING, BriefStatus.SHORTLISTED, BriefStatus.CANCELLED],
  [BriefStatus.MATCHING]: [BriefStatus.SHORTLISTED, BriefStatus.CANCELLED],
  [BriefStatus.SHORTLISTED]: [BriefStatus.QUOTING, BriefStatus.CANCELLED],
  [BriefStatus.QUOTING]: [BriefStatus.CLOSED, BriefStatus.CANCELLED],
  [BriefStatus.CLOSED]: [],
  [BriefStatus.CANCELLED]: [],
};

export const TERMINAL_BRIEF_STATUSES: readonly BriefStatus[] = [
  BriefStatus.CLOSED,
  BriefStatus.CANCELLED,
] as const;

/**
 * Checks whether a brief state transition is permitted.
 */
export function isAllowedBriefTransition(from: BriefStatus | string, to: BriefStatus | string): boolean {
  return BRIEF_TRANSITIONS[from as BriefStatus]?.includes(to as BriefStatus) ?? false;
}

export interface BriefViewable {
  brandId: string;
  status: BriefStatus | string;
  shortlists?: Array<{
    items?: Array<{
      factoryId: string;
    }>;
  }>;
}

export interface BriefEditable {
  brandId: string;
  status: BriefStatus | string;
}

/**
 * Determines if a user can view a specific brief.
 * - Admin sees all.
 * - Brand sees own briefs only.
 * - Factory sees brief only if shortlisted.
 */
export function canViewBrief(
  user: AuthUser,
  brief: BriefViewable,
  factoryId?: string,
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.BRAND) {
    return Boolean(user.brandId && user.brandId === brief.brandId);
  }

  if (user.role === Role.FACTORY) {
    const targetFactoryId = factoryId ?? user.factoryId;
    if (!targetFactoryId) {
      return false;
    }

    return Boolean(
      brief.shortlists?.some((s) =>
        s.items?.some((item) => item.factoryId === targetFactoryId),
      ),
    );
  }

  return false;
}

/**
 * Determines if a user can edit a brief.
 * Only the owning brand, and only when the brief is in DRAFT status.
 */
export function canEditBrief(user: AuthUser, brief: BriefEditable): boolean {
  if (user.role !== Role.BRAND || !user.brandId) {
    return false;
  }

  if (user.brandId !== brief.brandId) {
    return false;
  }

  return brief.status === BriefStatus.DRAFT;
}

/**
 * Determines if a user can submit a brief.
 * Only the owning brand, and only when the brief is in DRAFT status.
 */
export function canSubmitBrief(user: AuthUser, brief: BriefEditable): boolean {
  if (user.role !== Role.BRAND || !user.brandId) {
    return false;
  }

  if (user.brandId !== brief.brandId) {
    return false;
  }

  return brief.status === BriefStatus.DRAFT;
}

/**
 * Determines if a user can cancel a brief.
 * - Owning brand or admin.
 * - Cannot cancel terminal briefs (CLOSED or CANCELLED).
 */
export function canCancelBrief(user: AuthUser, brief: BriefEditable): boolean {
  if (TERMINAL_BRIEF_STATUSES.includes(brief.status as BriefStatus)) {
    return false;
  }

  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.BRAND && user.brandId) {
    return user.brandId === brief.brandId;
  }

  return false;
}
