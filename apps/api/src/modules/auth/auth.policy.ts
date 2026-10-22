import { AuthUser, Role } from '@factorymatch/shared';
import { NotFoundError } from '../../common/errors/app-error.js';

export class AuthPolicy {
  /**
   * Asserts brand access. Admins can view any brand.
   * Brand users can only access their own brand.
   * Other users receive a 404 to avoid leaking existence of the resource.
   */
  static assertBrandAccess(user: AuthUser, brandId: string): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (user.role === Role.BRAND && user.brandId === brandId) {
      return;
    }
    throw new NotFoundError('Brand not found');
  }

  /**
   * Asserts factory access. Admins can view any factory.
   * Factory users can only access their own factory.
   * Other users receive a 404 to avoid leaking existence.
   */
  static assertFactoryAccess(user: AuthUser, factoryId: string): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (user.role === Role.FACTORY && user.factoryId === factoryId) {
      return;
    }
    throw new NotFoundError('Factory not found');
  }
}
