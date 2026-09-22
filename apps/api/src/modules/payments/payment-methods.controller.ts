import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { JwtPayload } from '../../common/types/auth.types';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/create-payment-method.dto';
import { LOGO_MAX_BYTES } from './payment-files.service';
import { PaymentMethodsService } from './payment-methods.service';

/**
 * Paramètres → Moyens de paiement. Anyone in the business can read the active methods (the till
 * shows them to customers); only the owner can change them.
 */
@ApiBearerAuth()
@ApiTags('payment-methods')
@UseGuards(BusinessContextGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly methods: PaymentMethodsService) {}

  @Get()
  list(@CurrentBusiness() businessId: string, @CurrentUser() user: JwtPayload) {
    return this.methods.list(businessId, user.role);
  }

  @Post()
  @UseGuards(OwnerGuard)
  create(@CurrentBusiness() businessId: string, @Body() dto: CreatePaymentMethodDto) {
    return this.methods.create(businessId, dto);
  }

  @Get(':id')
  findOne(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.methods.findOne(businessId, id, user.role);
  }

  @Patch(':id')
  @UseGuards(OwnerGuard)
  update(
    @CurrentBusiness() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.methods.update(businessId, id, dto);
  }

  @Delete(':id')
  @UseGuards(OwnerGuard)
  @HttpCode(204)
  async remove(@CurrentBusiness() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.methods.remove(businessId, id);
  }

  @Put(':id/logo')
  @UseGuards(OwnerGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LOGO_MAX_BYTES, files: 1 } }))
  uploadLogo(
    @CurrentBusiness() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu (champ "file").');
    return this.methods.setLogo(businessId, id, file.buffer);
  }

  @Get(':id/logo')
  async logo(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, contentType } = await this.methods.readLogo(businessId, id, user.role);
    res.set({
      'Content-Type': contentType,
      'Content-Length': String(body.length),
      // The key changes on every upload, so the app can cache a logo for as long as it likes.
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(body);
  }

  @Delete(':id/logo')
  @UseGuards(OwnerGuard)
  removeLogo(@CurrentBusiness() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.methods.removeLogo(businessId, id);
  }
}
