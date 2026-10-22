import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service.js';
import { OrdersRepository } from './orders.repository.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  AuthUser,
  Role,
  UserStatus,
  OrderStatus,
  QuoteStatus,
} from '@factorymatch/shared';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors/app-error.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockRepo: any;
  let mockPrisma: any;

  const brandUserA: AuthUser = {
    id: 'usr-brand-a',
    email: 'brand-a@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-111',
    factoryId: null,
  };

  const brandUserB: AuthUser = {
    id: 'usr-brand-b',
    email: 'brand-b@test.com',
    phone: null,
    role: Role.BRAND,
    status: UserStatus.ACTIVE,
    brandId: 'brand-222',
    factoryId: null,
  };

  const factoryUserA: AuthUser = {
    id: 'usr-factory-a',
    email: null,
    phone: '+919876543210',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-aaa',
  };

  const factoryUserB: AuthUser = {
    id: 'usr-factory-b',
    email: null,
    phone: '+919876543211',
    role: Role.FACTORY,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: 'factory-bbb',
  };

  const adminUser: AuthUser = {
    id: 'usr-admin',
    email: 'admin@factorymatch.in',
    phone: null,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    brandId: null,
    factoryId: null,
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBrandId: vi.fn(),
      findByFactoryId: vi.fn(),
      findAll: vi.fn(),
      lockAndFindById: vi.fn(),
      updateStatus: vi.fn(),
      appendEvent: vi.fn(),
      findEventsByOrderId: vi.fn(),
      findQuoteById: vi.fn(),
    };

    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockRepo)),
    };

    service = new OrdersService(
      mockRepo as unknown as OrdersRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('createOrder', () => {
    const validQuote = {
      id: 'quote-100',
      status: QuoteStatus.ACCEPTED,
      pricePaisePerUnit: 2500, // 25 INR
      moqUnits: 500,
      leadTimeDays: 14,
      quoteRequest: {
        factoryId: 'factory-aaa',
        brief: {
          id: 'brief-50',
          brandId: 'brand-111',
        },
      },
    };

    it('successfully creates an order from an ACCEPTED quote and appends initial event', async () => {
      mockRepo.findQuoteById.mockResolvedValue(validQuote);
      const createdOrder = {
        id: 'ord-1',
        brandId: 'brand-111',
        factoryId: 'factory-aaa',
        quoteId: 'quote-100',
        totalPaise: 2500000, // 2500 * 1000 = 25,000 INR
        quantityUnits: 1000,
        status: OrderStatus.CONFIRMED,
      };
      mockRepo.create.mockResolvedValue(createdOrder);
      mockRepo.appendEvent.mockResolvedValue({});

      const result = await service.createOrder(brandUserA, {
        quoteId: 'quote-100',
        quantityUnits: 1000,
      });

      expect(result).toEqual(createdOrder);
      expect(mockRepo.create).toHaveBeenCalledWith(
        'brand-111',
        'factory-aaa',
        'quote-100',
        2500000,
        1000,
        expect.anything(),
      );
      expect(mockRepo.appendEvent).toHaveBeenCalledWith(
        expect.anything(),
        'ord-1',
        OrderStatus.CONFIRMED,
        OrderStatus.CONFIRMED,
        brandUserA.id,
        'Order created',
      );
    });

    it('rejects order creation if quote is not found', async () => {
      mockRepo.findQuoteById.mockResolvedValue(null);

      await expect(
        service.createOrder(brandUserA, { quoteId: 'quote-none', quantityUnits: 1000 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects order creation if quote belongs to another brand (404 without leaking)', async () => {
      mockRepo.findQuoteById.mockResolvedValue(validQuote);

      await expect(
        service.createOrder(brandUserB, { quoteId: 'quote-100', quantityUnits: 1000 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects order creation if quote is not ACCEPTED with ConflictError', async () => {
      mockRepo.findQuoteById.mockResolvedValue({
        ...validQuote,
        status: QuoteStatus.SUBMITTED,
      });

      await expect(
        service.createOrder(brandUserA, { quoteId: 'quote-100', quantityUnits: 1000 }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects order creation if quantity is below MOQ with ValidationError', async () => {
      mockRepo.findQuoteById.mockResolvedValue(validQuote);

      await expect(
        service.createOrder(brandUserA, { quoteId: 'quote-100', quantityUnits: 100 }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects order creation by factory user with ForbiddenError', async () => {
      await expect(
        service.createOrder(factoryUserA, { quoteId: 'quote-100', quantityUnits: 1000 }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('transition (State Machine & Locking)', () => {
    const existingOrder = {
      id: 'ord-123',
      brandId: 'brand-111',
      factoryId: 'factory-aaa',
      quoteId: 'quote-100',
      totalPaise: 500000,
      quantityUnits: 500,
      status: OrderStatus.CONFIRMED,
    };

    it('allows legal transition from CONFIRMED to SAMPLE_APPROVED by brand', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(existingOrder);
      const updated = { ...existingOrder, status: OrderStatus.SAMPLE_APPROVED };
      mockRepo.updateStatus.mockResolvedValue(updated);
      mockRepo.appendEvent.mockResolvedValue({});

      const result = await service.transition(
        brandUserA,
        'ord-123',
        OrderStatus.SAMPLE_APPROVED,
        'Sample passed lab test',
      );

      expect(result.status).toBe(OrderStatus.SAMPLE_APPROVED);
      expect(mockRepo.lockAndFindById).toHaveBeenCalled();
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        expect.anything(),
        'ord-123',
        OrderStatus.SAMPLE_APPROVED,
      );
      expect(mockRepo.appendEvent).toHaveBeenCalledWith(
        expect.anything(),
        'ord-123',
        OrderStatus.CONFIRMED,
        OrderStatus.SAMPLE_APPROVED,
        brandUserA.id,
        'Sample passed lab test',
      );
    });

    it('allows legal transition from ADVANCE_PAID to IN_PRODUCTION by factory', async () => {
      const advancePaidOrder = { ...existingOrder, status: OrderStatus.ADVANCE_PAID };
      mockRepo.lockAndFindById.mockResolvedValue(advancePaidOrder);
      const updated = { ...advancePaidOrder, status: OrderStatus.IN_PRODUCTION };
      mockRepo.updateStatus.mockResolvedValue(updated);
      mockRepo.appendEvent.mockResolvedValue({});

      const result = await service.transition(
        factoryUserA,
        'ord-123',
        OrderStatus.IN_PRODUCTION,
        'Raw material received, starting run',
      );

      expect(result.status).toBe(OrderStatus.IN_PRODUCTION);
      expect(mockRepo.appendEvent).toHaveBeenCalledWith(
        expect.anything(),
        'ord-123',
        OrderStatus.ADVANCE_PAID,
        OrderStatus.IN_PRODUCTION,
        factoryUserA.id,
        'Raw material received, starting run',
      );
    });

    it('allows brand to cancel an order from CONFIRMED status', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(existingOrder);
      mockRepo.updateStatus.mockResolvedValue({
        ...existingOrder,
        status: OrderStatus.CANCELLED,
      });
      mockRepo.appendEvent.mockResolvedValue({});

      const result = await service.transition(
        brandUserA,
        'ord-123',
        OrderStatus.CANCELLED,
        'Brand changed plans',
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('throws ConflictError on illegal state transition (CONFIRMED -> SHIPPED)', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(existingOrder);

      await expect(
        service.transition(adminUser, 'ord-123', OrderStatus.SHIPPED),
      ).rejects.toThrow(ConflictError);

      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockRepo.appendEvent).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when factory attempts an unpermitted transition (e.g. CANCELLED)', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(existingOrder);

      await expect(
        service.transition(factoryUserA, 'ord-123', OrderStatus.CANCELLED),
      ).rejects.toThrow(ForbiddenError);

      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when brand attempts a factory-owned transition (e.g. READY)', async () => {
      const inProdOrder = { ...existingOrder, status: OrderStatus.IN_PRODUCTION };
      mockRepo.lockAndFindById.mockResolvedValue(inProdOrder);

      await expect(
        service.transition(brandUserA, 'ord-123', OrderStatus.READY),
      ).rejects.toThrow(ForbiddenError);
    });

    it('denies cross-tenant transition by foreign brand with NotFoundError (404)', async () => {
      mockRepo.lockAndFindById.mockResolvedValue(existingOrder);

      await expect(
        service.transition(brandUserB, 'ord-123', OrderStatus.CANCELLED),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('denies cross-tenant transition by foreign factory with NotFoundError (404)', async () => {
      const readyOrder = { ...existingOrder, status: OrderStatus.READY };
      mockRepo.lockAndFindById.mockResolvedValue(readyOrder);

      await expect(
        service.transition(factoryUserB, 'ord-123', OrderStatus.SHIPPED),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('appends OrderEvent on EVERY state transition without mutating previous events', async () => {
      const inProdOrder = { ...existingOrder, status: OrderStatus.IN_PRODUCTION };
      mockRepo.lockAndFindById.mockResolvedValue(inProdOrder);
      mockRepo.updateStatus.mockResolvedValue({
        ...inProdOrder,
        status: OrderStatus.READY,
      });
      mockRepo.appendEvent.mockResolvedValue({});

      await service.transition(
        factoryUserA,
        'ord-123',
        OrderStatus.READY,
        'Batch completed packaging',
      );

      expect(mockRepo.appendEvent).toHaveBeenCalledTimes(1);
      expect(mockRepo.appendEvent).toHaveBeenCalledWith(
        expect.anything(),
        'ord-123',
        OrderStatus.IN_PRODUCTION,
        OrderStatus.READY,
        factoryUserA.id,
        'Batch completed packaging',
      );
    });
  });

  describe('getForUser', () => {
    const existingOrder = {
      id: 'ord-123',
      brandId: 'brand-111',
      factoryId: 'factory-aaa',
    };

    it('allows brand owner to retrieve order', async () => {
      mockRepo.findById.mockResolvedValue(existingOrder);

      const result = await service.getForUser(brandUserA, 'ord-123');
      expect(result).toEqual(existingOrder);
    });

    it('denies foreign brand with NotFoundError (404)', async () => {
      mockRepo.findById.mockResolvedValue(existingOrder);

      await expect(service.getForUser(brandUserB, 'ord-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('allows factory to retrieve order', async () => {
      mockRepo.findById.mockResolvedValue(existingOrder);

      const result = await service.getForUser(factoryUserA, 'ord-123');
      expect(result).toEqual(existingOrder);
    });

    it('denies foreign factory with NotFoundError (404)', async () => {
      mockRepo.findById.mockResolvedValue(existingOrder);

      await expect(service.getForUser(factoryUserB, 'ord-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('allows admin to retrieve any order', async () => {
      mockRepo.findById.mockResolvedValue(existingOrder);

      const result = await service.getForUser(adminUser, 'ord-123');
      expect(result).toEqual(existingOrder);
    });
  });

  describe('getOrderEvents', () => {
    it('returns event timeline for authorized user', async () => {
      const existingOrder = {
        id: 'ord-123',
        brandId: 'brand-111',
        factoryId: 'factory-aaa',
      };
      mockRepo.findById.mockResolvedValue(existingOrder);
      mockRepo.findEventsByOrderId.mockResolvedValue([
        {
          id: 'evt-1',
          orderId: 'ord-123',
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.CONFIRMED,
          actorUserId: 'usr-brand-a',
          reason: 'Order created',
          createdAt: new Date(),
        },
      ]);

      const events = await service.getOrderEvents(brandUserA, 'ord-123');
      expect(events).toHaveLength(1);
      expect(events[0].toStatus).toBe(OrderStatus.CONFIRMED);
    });

    it('denies event timeline to unauthorized user with NotFoundError', async () => {
      const existingOrder = {
        id: 'ord-123',
        brandId: 'brand-111',
        factoryId: 'factory-aaa',
      };
      mockRepo.findById.mockResolvedValue(existingOrder);

      await expect(service.getOrderEvents(brandUserB, 'ord-123')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
