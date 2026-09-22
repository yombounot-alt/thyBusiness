import { Module } from '@nestjs/common';
import { MockOtpSenderAdapter } from './mock-otp-sender.adapter';
import { OTP_SENDER } from './otp-sender.port';
import { OtpService } from './otp.service';

@Module({
  providers: [
    OtpService,
    {
      provide: OTP_SENDER,
      useClass: MockOtpSenderAdapter,
    },
  ],
  exports: [OtpService],
})
export class OtpModule {}
