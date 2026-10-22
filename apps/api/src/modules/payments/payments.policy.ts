import { AuthUser, Role } from '@factorymatch/shared';

export interface OrderOwnershipContext {
  brandId: string;
  factoryId: string;
  brand?: {
    id?: string;
    userId?: string;
  } | null;
  factory?: {
    id?: string;
    ownerUserId?: string;
  } | null;
}

export interface PaymentContext {
  orderId: string;
}

/**
 * Pure authorization policy function for payment creation.
 * Rules:
 * - Admin can create payment for any order.
 * - Brand who owns the order can create payment.
 * - Factories and unauthenticated/unrelated users cannot create payments.
 */
export function canCreatePayment(
  user: AuthUser,
  order: {
    brandId: string;
    brand?: {
      id?: string;
      userId?: string;
    } | null;
  },
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role !== Role.BRAND) {
    return false;
  }

  if (user.brandId && user.brandId === order.brandId) {
    return true;
  }

  if (order.brand?.userId && order.brand.userId === user.id) {
    return true;
  }

  return false;
}

/**
 * Pure authorization policy function for viewing a payment.
 * Rules:
 * - Admin can view all payments.
 * - Brand can view payments for their own orders.
 * - Factory can view payments for orders assigned to their factory.
 * - Cross-tenant access is denied.
 */
export function canViewPayment(
  user: AuthUser,
  payment: PaymentContext,
  order: OrderOwnershipContext,
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.BRAND) {
    if (user.brandId && user.brandId === order.brandId) {
      return true;
    }
    if (order.brand?.userId && order.brand.userId === user.id) {
      return true;
    }
    return false;
  }

  if (user.role === Role.FACTORY) {
    if (user.factoryId && user.factoryId === order.factoryId) {
      return true;
    }
    if (order.factory?.ownerUserId && order.factory.ownerUserId === user.id) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Pure authorization policy function for listing payments for an order.
 */
export function canViewOrderPayments(user: AuthUser, order: OrderOwnershipContext): boolean {
  return canViewPayment(user, { orderId: '' }, order);
}
