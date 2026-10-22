import { describe, it, expect } from 'vitest';
import { canCreateReview } from './reviews.policy.js';
import { AuthUser, OrderStatus } from '@factorymatch/shared';

describe('Reviews Policy', () => {
  const brandUser: AuthUser = {
    id: 'user-b1',
    role: 'BRAND',
    brandId: 'brand-1',
  };

  const otherBrandUser: AuthUser = {
    id: 'user-b2',
    role: 'BRAND',
    brandId: 'brand-2',
  };

  const factoryUser: AuthUser = {
    id: 'user-f1',
    role: 'FACTORY',
    factoryId: 'factory-1',
  };

  const completedOrder = {
    id: 'ord-1',
    brandId: 'brand-1',
    factoryId: 'factory-1',
    status: OrderStatus.COMPLETED,
  };

  const nonCompletedOrder = {
    id: 'ord-2',
    brandId: 'brand-1',
    factoryId: 'factory-1',
    status: OrderStatus.IN_PRODUCTION,
  };

  it('allows owning brand to review completed order', () => {
    expect(canCreateReview(brandUser, completedOrder)).toBe(true);
  });

  it('denies brand from reviewing non-completed order', () => {
    expect(canCreateReview(brandUser, nonCompletedOrder)).toBe(false);
  });

  it('denies cross-tenant brand from reviewing another brand order', () => {
    expect(canCreateReview(otherBrandUser, completedOrder)).toBe(false);
  });

  it('denies factory user from creating review', () => {
    expect(canCreateReview(factoryUser, completedOrder)).toBe(false);
  });
});
