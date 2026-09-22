import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/auth.types';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsQuery } from './dto/list-movements.query';
import { InventoryService } from './inventory.service';

@ApiBearerAuth()
@ApiTags('inventory')
@UseGuards(BusinessContextGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('movements')
  recordMovement(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventory.recordManualMovement(businessId, dto, user.sub);
  }

  @Get('movements')
  findAll(@CurrentBusiness() businessId: string, @Query() query: ListMovementsQuery) {
    return this.inventory.findAll(businessId, query);
  }
}
