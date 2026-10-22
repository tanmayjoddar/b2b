import {
  AuthUser,
  Role,
  QuoteRequestStatus,
  QuoteStatus,
} from '@factorymatch/shared';

/**
 * Explicit allowed transitions for QuoteRequest status.
 * REQUESTED -> SUBMITTED | EXPIRED | WITHDRAWN
 * SUBMITTED -> ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
 */
export const ALLOWED_QUOTE_REQUEST_TRANSITIONS: Record<
  QuoteRequestStatus,
  QuoteRequestStatus[]
> = {
  [QuoteRequestStatus.REQUESTED]: [
    QuoteRequestStatus.SUBMITTED,
    QuoteRequestStatus.EXPIRED,
    QuoteRequestStatus.WITHDRAWN,
  ],
  [QuoteRequestStatus.SUBMITTED]: [
    QuoteRequestStatus.ACCEPTED,
    QuoteRequestStatus.REJECTED,
    QuoteRequestStatus.EXPIRED,
    QuoteRequestStatus.WITHDRAWN,
  ],
  [QuoteRequestStatus.ACCEPTED]: [],
  [QuoteRequestStatus.REJECTED]: [],
  [QuoteRequestStatus.EXPIRED]: [],
  [QuoteRequestStatus.WITHDRAWN]: [],
};

/**
 * Explicit allowed transitions for Quote status.
 * SUBMITTED -> ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
 */
export const ALLOWED_QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.SUBMITTED]: [
    QuoteStatus.ACCEPTED,
    QuoteStatus.REJECTED,
    QuoteStatus.EXPIRED,
    QuoteStatus.WITHDRAWN,
  ],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.REJECTED]: [],
  [QuoteStatus.EXPIRED]: [],
  [QuoteStatus.WITHDRAWN]: [],
};

/**
 * Validates whether a QuoteRequest state transition is allowed.
 */
export function canTransitionQuoteRequest(
  from: QuoteRequestStatus | string,
  to: QuoteRequestStatus | string,
): boolean {
  return ALLOWED_QUOTE_REQUEST_TRANSITIONS[from as QuoteRequestStatus]?.includes(to as QuoteRequestStatus) ?? false;
}

/**
 * Validates whether a Quote state transition is allowed.
 */
export function canTransitionQuote(
  from: QuoteStatus | string,
  to: QuoteStatus | string,
): boolean {
  return ALLOWED_QUOTE_TRANSITIONS[from as QuoteStatus]?.includes(to as QuoteStatus) ?? false;
}

/**
 * Factory sees own requests, admin sees all, brand sees if owns the brief.
 */
export function canViewQuoteRequest(
  user: AuthUser,
  quoteRequest: {
    factoryId: string;
    brief?: { brandId: string } | null;
    briefBrandId?: string;
  },
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.FACTORY) {
    return Boolean(user.factoryId && user.factoryId === quoteRequest.factoryId);
  }

  if (user.role === Role.BRAND) {
    const briefBrandId = quoteRequest.brief?.brandId ?? quoteRequest.briefBrandId;
    return Boolean(user.brandId && briefBrandId && user.brandId === briefBrandId);
  }

  return false;
}

/**
 * Only the factory that received the request can submit a quote.
 * Must be in REQUESTED status and not expired.
 */
export function canSubmitQuote(
  user: AuthUser,
  quoteRequest: {
    factoryId: string;
    status: QuoteRequestStatus | string;
    expiresAt?: Date | string;
  },
): boolean {
  if (user.role !== Role.FACTORY || !user.factoryId) {
    return false;
  }

  if (user.factoryId !== quoteRequest.factoryId) {
    return false;
  }

  if (quoteRequest.status !== (QuoteRequestStatus.REQUESTED as string)) {
    return false;
  }

  if (quoteRequest.expiresAt && new Date(quoteRequest.expiresAt) <= new Date()) {
    return false;
  }

  return true;
}

/**
 * Brand sees quotes for own briefs but NEVER competitor factory quotes on other brands' briefs.
 * Factory NEVER sees other factories' quotes (even for the same brief).
 * Admin sees all.
 */
export function canViewQuote(
  user: AuthUser,
  quote: {
    factoryId?: string;
    quoteRequest?: {
      factoryId: string;
      brief?: { brandId: string } | null;
    } | null;
  },
  briefBrandId?: string,
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.FACTORY) {
    const quoteFactoryId = quote.factoryId ?? quote.quoteRequest?.factoryId;
    return Boolean(user.factoryId && quoteFactoryId && user.factoryId === quoteFactoryId);
  }

  if (user.role === Role.BRAND) {
    const resolvedBrandId = briefBrandId ?? quote.quoteRequest?.brief?.brandId;
    return Boolean(user.brandId && resolvedBrandId && user.brandId === resolvedBrandId);
  }

  return false;
}

/**
 * Only the owning brand can accept or reject a quote on its brief.
 */
export function canDecideQuote(
  user: AuthUser,
  brief: { brandId: string },
): boolean {
  if (user.role === Role.BRAND && Boolean(user.brandId) && user.brandId === brief.brandId) {
    return true;
  }

  return false;
}
