import { AuthUser, Role, OrderStatus } from '@factorymatch/shared';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';

export interface OrderOwnershipContext {
  brandId: string;
  factoryId: string;
  status?: OrderStatus | string;
}

export class OrdersPolicy {
  /**
   * Checks whether the user is authorized to view the given order.
   * Brand users can only see orders where brandId matches their brand.
   * Factory users can only see orders where factoryId matches their factory.
   * Admins can view any order.
   */
  static canViewOrder(user: AuthUser, order: OrderOwnershipContext): boolean {
    if (user.role === Role.ADMIN) {
      return true;
    }
    if (user.role === Role.BRAND && user.brandId && user.brandId === order.brandId) {
      return true;
    }
    if (user.role === Role.FACTORY && user.factoryId && user.factoryId === order.factoryId) {
      return true;
    }
    return false;
  }

  /**
   * Asserts view permission. Throws NotFoundError (404) to avoid leaking the existence
   * of orders the user must not know about.
   */
  static assertCanView(user: AuthUser, order: OrderOwnershipContext): void {
    if (!this.canViewOrder(user, order)) {
      throw new NotFoundError('Order not found');
    }
  }

  /**
   * Checks whether the user is authorized to perform a status transition to `toStatus`.
   * Role-based permissions:
   * - ADMIN: can perform any legal transition
   * - BRAND: can cancel, approve sample, pay advance, dispute, or mark completed/delivered
   * - FACTORY: can start production, mark ready, inspect, or ship
   */
  static canTransition(
    user: AuthUser,
    order: OrderOwnershipContext,
    toStatus: OrderStatus | string,
  ): boolean {
    if (!this.canViewOrder(user, order)) {
      return false;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (user.role === Role.BRAND) {
      const allowedBrandTransitions: string[] = [
        OrderStatus.SAMPLE_APPROVED,
        OrderStatus.ADVANCE_PAID,
        OrderStatus.CANCELLED,
        OrderStatus.DISPUTED,
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
      ];
      return allowedBrandTransitions.includes(toStatus);
    }

    if (user.role === Role.FACTORY) {
      const allowedFactoryTransitions: string[] = [
        OrderStatus.IN_PRODUCTION,
        OrderStatus.READY,
        OrderStatus.INSPECTED,
        OrderStatus.SHIPPED,
      ];
      return allowedFactoryTransitions.includes(toStatus);
    }

    return false;
  }

  /**
   * Asserts transition permission. Throws 404 if the user cannot view the order,
   * or 403 if they can view it but lack permission to trigger this specific transition.
   */
  static assertCanTransition(
    user: AuthUser,
    order: OrderOwnershipContext,
    toStatus: OrderStatus | string,
  ): void {
    this.assertCanView(user, order);

    if (!this.canTransition(user, order, toStatus)) {
      throw new ForbiddenError(`Role ${user.role} is not permitted to transition order to ${toStatus}`);
    }
  }
}
