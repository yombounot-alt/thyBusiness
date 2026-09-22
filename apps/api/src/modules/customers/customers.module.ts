import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [CreditsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
