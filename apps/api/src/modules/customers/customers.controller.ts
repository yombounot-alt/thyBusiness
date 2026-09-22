import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/auth.types';
import { CreditsService } from '../credits/credits.service';
import { GrantCreditDto } from '../credits/dto/grant-credit.dto';
import { RecordCreditPaymentDto } from '../credits/dto/record-credit-payment.dto';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQuery } from './dto/list-customers.query';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiBearerAuth()
@ApiTags('customers')
@UseGuards(BusinessContextGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly credits: CreditsService,
  ) {}

  @Post()
  create(@CurrentBusiness() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusiness() businessId: string, @Query() query: ListCustomersQuery) {
    return this.customers.findAll(businessId, query);
  }

  @Get(':id')
  findOne(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.customers.findOne(businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentBusiness() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.customers.remove(businessId, id);
  }

  @Get(':id/credits')
  listCredits(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.credits.listForCustomer(businessId, id);
  }

  @Get(':id/statement')
  statement(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.credits.getStatement(businessId, id);
  }

  @Post(':id/credits')
  grantCredit(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: GrantCreditDto,
  ) {
    return this.credits.grantManual(businessId, id, dto, user.sub);
  }

  @Post(':id/credit-payments')
  recordCreditPayment(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RecordCreditPaymentDto,
  ) {
    return this.credits.recordPayment(businessId, id, dto, user.sub);
  }
}
