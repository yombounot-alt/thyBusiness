import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/auth.types';
import { AuthService } from '../auth/auth.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@ApiBearerAuth()
@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBusinessDto) {
    const business = await this.businesses.create(user.sub, dto);
    const tokens = await this.authService.issueTokensForUser(user.sub);
    return { business, ...tokens };
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.businesses.listForUser(user.sub);
  }

  @UseGuards(BusinessContextGuard)
  @Get('current')
  getCurrent(@CurrentBusiness() businessId: string) {
    return this.businesses.getCurrent(businessId);
  }

  @UseGuards(BusinessContextGuard)
  @Patch('current')
  updateCurrent(@CurrentBusiness() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businesses.updateCurrent(businessId, dto);
  }
}
