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
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQuery } from './dto/list-expenses.query';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiBearerAuth()
@ApiTags('expenses')
@UseGuards(BusinessContextGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.create(businessId, dto, user.sub);
  }

  @Get()
  findAll(@CurrentBusiness() businessId: string, @Query() query: ListExpensesQuery) {
    return this.expenses.findAll(businessId, query);
  }

  @Get(':id')
  findOne(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.expenses.findOne(businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentBusiness() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.expenses.remove(businessId, id);
  }
}
