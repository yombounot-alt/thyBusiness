import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardPeriodQuery } from './dto/dashboard-period.query';
import { SalesChartQuery } from './dto/sales-chart.query';
import { TopProductsQuery } from './dto/top-products.query';

@ApiBearerAuth()
@ApiTags('dashboard')
@UseGuards(BusinessContextGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentBusiness() businessId: string, @Query() query: DashboardPeriodQuery) {
    return this.dashboard.getSummary(businessId, query);
  }

  @Get('sales-chart')
  getSalesChart(@CurrentBusiness() businessId: string, @Query() query: SalesChartQuery) {
    return this.dashboard.getSalesChart(businessId, query);
  }

  @Get('top-products')
  getTopProducts(@CurrentBusiness() businessId: string, @Query() query: TopProductsQuery) {
    return this.dashboard.getTopProducts(businessId, query);
  }
}
