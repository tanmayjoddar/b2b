import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  AuthUser,
  CreateReviewDto,
  CreateReviewSchema,
  Role,
} from '@factorymatch/shared';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReviewsService } from './reviews.service.js';

@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post('reviews')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.BRAND)
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
  ) {
    const data = await this.service.createReview(user, dto);
    return { data };
  }

  @Get('factories/:factoryId/reviews')
  async getFactoryReviews(
    @Param('factoryId') factoryId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const data = await this.service.getReviewsForFactory(
      factoryId,
      parsedLimit,
      parsedOffset,
    );
    return { data };
  }
}
