import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OTP_SENDER, OtpSenderPort } from './otp-sender.port';

export type OtpPurpose = 'signup' | 'login' | 'password_reset';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class OtpService {
  private readonly ttlMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OTP_SENDER) private readonly sender: OtpSenderPort,
  ) {
    this.ttlMinutes = this.config.get<number>('otp.ttlMinutes')!;
    this.maxAttempts = this.config.get<number>('otp.maxAttempts')!;
  }

  async issue(phone: string, purpose: OtpPurpose): Promise<void> {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);

    await this.prisma.otpVerification.create({
      data: { phone, purpose, code, expiresAt },
    });

    await this.sender.send(phone, code);
  }

  async verify(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.prisma.otpVerification.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Aucun code en attente pour ce numéro.');
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Le code a expiré, veuillez en demander un nouveau.');
    }
    if (otp.attempts >= this.maxAttempts) {
      throw new BadRequestException('Trop de tentatives, veuillez demander un nouveau code.');
    }

    if (otp.code !== code) {
      await this.prisma.otpVerification.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code invalide.');
    }

    await this.prisma.otpVerification.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }
}
