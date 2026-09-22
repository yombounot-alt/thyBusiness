import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/auth.types';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQuery } from './dto/list-sales.query';
import { SalesService } from './sales.service';

@ApiBearerAuth()
@ApiTags('sales')
@UseGuards(BusinessContextGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  checkout(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSaleDto,
  ) {
    return this.sales.checkout(businessId, dto, user.sub);
  }

  @Get()
  findAll(@CurrentBusiness() businessId: string, @Query() query: ListSalesQuery) {
    return this.sales.findAll(businessId, query);
  }

  @Get(':id')
  findOne(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.sales.findOne(businessId, id);
  }

  @Post(':id/void')
  voidSale(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.sales.void(businessId, id, user.sub);
  }
}
