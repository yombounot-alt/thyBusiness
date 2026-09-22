import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CreditsService } from './credits.service';
import { ListCreditsQuery } from './dto/list-credits.query';

@ApiBearerAuth()
@ApiTags('credits')
@UseGuards(BusinessContextGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  findAll(@CurrentBusiness() businessId: string, @Query() query: ListCreditsQuery) {
    return this.credits.listBusinessWide(businessId, query);
  }
}
