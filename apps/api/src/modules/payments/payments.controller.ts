import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentBusiness } from '../../common/decorators/current-business.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessContextGuard } from '../../common/guards/business-context.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { JwtPayload } from '../../common/types/auth.types';
import { ListPaymentsQuery } from './dto/list-payments.query';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { StartPaymentDto } from './dto/start-payment.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { PROOF_MAX_BYTES } from './payment-files.service';
import { PaymentsService } from './payments.service';

@ApiBearerAuth()
@ApiTags('payments')
@UseGuards(BusinessContextGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Le client choisit un moyen de paiement : voir où envoyer l’argent',
    description:
      "Le montant est calculé par le serveur. Rien n'est vendu tant que le propriétaire n'a pas validé le paiement.",
  })
  start(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartPaymentDto,
  ) {
    return this.payments.start(businessId, user.sub, dto);
  }

  @Get()
  list(@CurrentBusiness() businessId: string, @Query() query: ListPaymentsQuery) {
    return this.payments.list(businessId, query);
  }

  // Declared before ':id' so that "summary" is not read as an id.
  @Get('summary')
  @ApiOperation({ summary: 'Nombre de paiements par statut (badge « à vérifier »)' })
  summary(@CurrentBusiness() businessId: string) {
    return this.payments.summary(businessId);
  }

  @Get(':id')
  findOne(@CurrentBusiness() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(businessId, id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: '« J’ai effectué le paiement » : déclare le paiement (en attente de vérification)',
  })
  submit(
    @CurrentBusiness() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.payments.submit(businessId, id, dto);
  }

  @Post(':id/verify')
  @UseGuards(OwnerGuard)
  @ApiOperation({ summary: 'Le propriétaire valide : la vente est enregistrée' })
  verify(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.verify(businessId, user.sub, id);
  }

  @Post(':id/reject')
  @UseGuards(OwnerGuard)
  @ApiOperation({ summary: 'Le propriétaire refuse (motif facultatif)' })
  reject(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.payments.reject(businessId, user.sub, id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.cancel(businessId, user.role, id);
  }

  @Put(':id/proof')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PROOF_MAX_BYTES, files: 1 } }))
  uploadProof(
    @CurrentBusiness() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu (champ "file").');
    return this.payments.setProof(businessId, id, file.buffer);
  }

  @Get(':id/proof')
  async proof(
    @CurrentBusiness() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, contentType } = await this.payments.readProof(businessId, id);
    res.set({
      'Content-Type': contentType,
      'Content-Length': String(body.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(body);
  }

  @Delete(':id/proof')
  removeProof(@CurrentBusiness() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.removeProof(businessId, id);
  }
}
