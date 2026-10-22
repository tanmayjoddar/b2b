import { AuthUser, Role, SampleStatus } from '@factorymatch/shared';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';

export interface SampleOwnershipContext {
  factoryId: string;
  brief?: {
    brandId: string;
  } | null;
  status?: SampleStatus | string;
}

export class SamplesPolicy {
  /**
   * Checks whether the user is authorized to view the given sample.
   * Brand users can only see samples for their own briefs.
   * Factory users can only see samples assigned to their factory.
   * Admins can view any sample.
   */
  static canViewSample(user: AuthUser, sample: SampleOwnershipContext): boolean {
    if (user.role === Role.ADMIN) {
      return true;
    }
    if (user.role === Role.BRAND && user.brandId && sample.brief?.brandId === user.brandId) {
      return true;
    }
    if (user.role === Role.FACTORY && user.factoryId && user.factoryId === sample.factoryId) {
      return true;
    }
    return false;
  }

  /**
   * Asserts view permission. Throws NotFoundError (404) to avoid leaking the existence
   * of samples the user must not know about.
   */
  static assertCanView(user: AuthUser, sample: SampleOwnershipContext): void {
    if (!this.canViewSample(user, sample)) {
      throw new NotFoundError('Sample not found');
    }
  }

  /**
   * Checks whether the user has permission to transition the sample to `toStatus`.
   * Role rules:
   * - ADMIN: can perform any legal transition
   * - FACTORY: can dispatch the requested sample (DISPATCHED)
   * - BRAND: can mark sample received (RECEIVED), approved (APPROVED), or rejected (REJECTED)
   */
  static canTransition(
    user: AuthUser,
    sample: SampleOwnershipContext,
    toStatus: SampleStatus | string,
  ): boolean {
    if (!this.canViewSample(user, sample)) {
      return false;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (user.role === Role.FACTORY) {
      const allowedFactoryTransitions: string[] = [SampleStatus.DISPATCHED];
      return allowedFactoryTransitions.includes(toStatus);
    }

    if (user.role === Role.BRAND) {
      const allowedBrandTransitions: string[] = [
        SampleStatus.RECEIVED,
        SampleStatus.APPROVED,
        SampleStatus.REJECTED,
      ];
      return allowedBrandTransitions.includes(toStatus);
    }

    return false;
  }

  /**
   * Asserts transition permission. Throws 404 if cannot view, or 403 if forbidden.
   */
  static assertCanTransition(
    user: AuthUser,
    sample: SampleOwnershipContext,
    toStatus: SampleStatus | string,
  ): void {
    this.assertCanView(user, sample);

    if (!this.canTransition(user, sample, toStatus)) {
      throw new ForbiddenError(
        `Role ${user.role} is not permitted to transition sample to ${toStatus}`,
      );
    }
  }
}
