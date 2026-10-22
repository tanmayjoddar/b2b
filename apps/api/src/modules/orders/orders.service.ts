import { Injectable, Logger } from '@nestjs/common';
import {
  AuthUser,
  Role,
  OrderStatus,
  QuoteStatus,
  ORDER_TRANSITIONS,
  CreateOrderDto,
  PaginationQuery,
} from '@factorymatch/shared';
import { OrdersRepository } from './orders.repository.js';
import { OrdersPolicy } from './orders.policy.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../common/errors/app-error.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new order from an ACCEPTED quote.
   * Calculates totalPaise from unit price and quantity.
   * Creates order in CONFIRMED status and appends initial event.
   */
  async createOrder(brandUser: AuthUser, dto: CreateOrderDto) {
    if (brandUser.role !== Role.BRAND && brandUser.role !== Role.ADMIN) {
      throw new ForbiddenError('Only brand users or administrators can create orders');
    }

    const quote = await this.ordersRepo.findQuoteById(dto.quoteId);
    if (!quote) {
      throw new NotFoundError('Quote not found');
    }

    // Ownership check on quote: brand can only order from its own briefs
    if (brandUser.role === Role.BRAND) {
      if (!brandUser.brandId || quote.quoteRequest.brief.brandId !== brandUser.brandId) {
        throw new NotFoundError('Quote not found');
      }
    }

    if (quote.status !== (QuoteStatus.ACCEPTED as string)) {
      throw new ConflictError('Order can only be created for accepted quotes');
    }

    if (dto.quantityUnits < quote.moqUnits) {
      throw new ValidationError(
        `Quantity (${dto.quantityUnits}) is less than MOQ (${quote.moqUnits})`,
      );
    }

    const totalPaise = quote.pricePaisePerUnit * dto.quantityUnits;
    const brandId = quote.quoteRequest.brief.brandId;
    const factoryId = quote.quoteRequest.factoryId;

    return this.prisma.$transaction(async (tx) => {
      const order = await this.ordersRepo.create(
        brandId,
        factoryId,
        quote.id,
        totalPaise,
        dto.quantityUnits,
        tx,
      );

      await this.ordersRepo.appendEvent(
        tx,
        order.id,
        OrderStatus.CONFIRMED,
        OrderStatus.CONFIRMED,
        brandUser.id,
        'Order created',
      );

      this.logger.log(`Order created: ${order.id} for brand: ${brandId}, totalPaise: ${totalPaise}`);
      return order;
    });
  }

  /**
   * Retrieves an order by ID after policy authorization check.
   */
  async getForUser(user: AuthUser, id: string) {
    const order = await this.ordersRepo.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    OrdersPolicy.assertCanView(user, order);
    return order;
  }

  /**
   * Lists orders accessible to the current user (filtered by tenant ownership).
   */
  async listForUser(user: AuthUser, pagination?: PaginationQuery) {
    if (user.role === Role.ADMIN) {
      return this.ordersRepo.findAll(pagination);
    }

    if (user.role === Role.BRAND && user.brandId) {
      return this.ordersRepo.findByBrandId(user.brandId, pagination);
    }

    if (user.role === Role.FACTORY && user.factoryId) {
      return this.ordersRepo.findByFactoryId(user.factoryId, pagination);
    }

    return [];
  }

  /**
   * THE critical method: State machine transition execution with:
   * 1. Database transaction
   * 2. Row locking (SELECT FOR UPDATE)
   * 3. State machine validation against ORDER_TRANSITIONS
   * 4. Actor permission verification via OrdersPolicy
   * 5. Status update and append-only OrderEvent creation
   */
  async transition(
    user: AuthUser,
    orderId: string,
    toStatus: OrderStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1 & 2: Lock order row inside transaction
      const order = await this.ordersRepo.lockAndFindById(tx, orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check view access (fails silently with 404 to avoid leaking existence)
      OrdersPolicy.assertCanView(user, order);

      const currentStatus = order.status as OrderStatus;

      // 3: Validate against ORDER_TRANSITIONS state machine
      const allowedTransitions = ORDER_TRANSITIONS[currentStatus] ?? [];
      if (!allowedTransitions.includes(toStatus)) {
        throw new ConflictError(
          `Illegal status transition from ${currentStatus} to ${toStatus}. Allowed transitions: ${
            allowedTransitions.join(', ') || 'none'
          }`,
        );
      }

      // 4: Check actor permissions via policy
      OrdersPolicy.assertCanTransition(user, order, toStatus);

      // 5: Update order status
      const updatedOrder = await this.ordersRepo.updateStatus(tx, orderId, toStatus);

      // 6: Append OrderEvent (append-only)
      await this.ordersRepo.appendEvent(
        tx,
        orderId,
        currentStatus,
        toStatus,
        user.id,
        reason ?? null,
      );

      this.logger.log(
        `Order ${orderId} transitioned: ${currentStatus} -> ${toStatus} by user ${user.id} (${user.role})`,
      );

      return updatedOrder;
    });
  }

  /**
   * Retrieves timeline events for an order after policy check.
   */
  async getOrderEvents(user: AuthUser, orderId: string) {
    const order = await this.ordersRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    OrdersPolicy.assertCanView(user, order);
    return this.ordersRepo.findEventsByOrderId(orderId);
  }
}
