import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { StorageModule } from '../storage/storage.module';
import { PaymentFilesService } from './payment-files.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Direct payments (Orange Money, Mobile Money, merchant code): the customer pays the owner's number
 * or code, the owner verifies. No payment gateway is involved — see docs/decisions/0011.
 */
@Module({
  imports: [SalesModule, StorageModule],
  controllers: [PaymentMethodsController, PaymentsController],
  providers: [PaymentsService, PaymentMethodsService, PaymentFilesService],
})
export class PaymentsModule {}
