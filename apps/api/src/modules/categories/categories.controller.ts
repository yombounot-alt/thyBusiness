import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiBearerAuth()
@ApiTags('categories')
@UseGuards(BusinessContextGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  create(@CurrentBusiness() businessId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusiness() businessId: string) {
    return this.categories.findAll(businessId);
  }

  @Get(':id')
  findOne(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.categories.findOne(businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentBusiness() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentBusiness() businessId: string, @Param('id') id: string) {
    return this.categories.remove(businessId, id);
  }
}
