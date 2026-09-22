import { Injectable, Logger } from '@nestjs/common';
import { OtpSenderPort } from './otp-sender.port';

@Injectable()
export class MockOtpSenderAdapter implements OtpSenderPort {
  private readonly logger = new Logger('OTP');

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`[MOCK OTP] ${phone}: ${code}`);
  }
}
