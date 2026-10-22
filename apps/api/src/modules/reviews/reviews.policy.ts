import { AuthUser, OrderStatus } from '@factorymatch/shared';

export interface OrderForReviewCheck {
  id: string;
  brandId: string;
  factoryId: string;
  status: OrderStatus;
}

export function canCreateReview(
  user: AuthUser,
  order: OrderForReviewCheck,
): boolean {
  if (user.role !== 'BRAND') {
    return false;
  }
  if (!user.brandId || user.brandId !== order.brandId) {
    return false;
  }
  return order.status === OrderStatus.COMPLETED;
}

export function canViewReviews(): boolean {
  return true;
}
