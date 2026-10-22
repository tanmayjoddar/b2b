import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  Role,
  AuthUser,
  CreateOrderSchema,
  CreateOrderDto,
  TransitionOrderSchema,
  TransitionOrderDto,
  PaginationQuerySchema,
  PaginationQuery,
} from '@factorymatch/shared';
import { OrdersService } from './orders.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('api/v1/orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /api/v1/orders
   * Creates an order from an accepted quote. Only brands and admins can initiate orders.
   */
  @Post()
  @Roles(Role.BRAND, Role.ADMIN)
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
  ) {
    const order = await this.ordersService.createOrder(user, dto);
    return { data: order };
  }

  /**
   * GET /api/v1/orders
   * Lists orders for the authenticated user, automatically scoped to their tenant.
   */
  @Get()
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) pagination: PaginationQuery,
  ) {
    const orders = await this.ordersService.listForUser(user, pagination);
    return { data: orders };
  }

  /**
   * GET /api/v1/orders/:id
   * Retrieves single order details with ownership verification.
   */
  @Get(':id')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const order = await this.ordersService.getForUser(user, id);
    return { data: order };
  }

  /**
   * POST /api/v1/orders/:id/transition
   * Executes a verified state machine transition.
   */
  @Post(':id/transition')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(TransitionOrderSchema)) dto: TransitionOrderDto,
  ) {
    const updated = await this.ordersService.transition(user, id, dto.toStatus, dto.reason);
    return { data: updated };
  }

  /**
   * GET /api/v1/orders/:id/events
   * Retrieves the immutable timeline of status change events for an order.
   */
  @Get(':id/events')
  @Roles(Role.BRAND, Role.FACTORY, Role.ADMIN)
  async getEvents(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const events = await this.ordersService.getOrderEvents(user, id);
    return { data: events };
  }
}
