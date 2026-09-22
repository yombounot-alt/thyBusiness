import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../../common/types/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshTtlDays = this.config.get<number>('jwt.refreshTtlDays')!;
  }

  async signup(dto: SignupDto): Promise<{ userId: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      email: dto.email,
    });
    await this.otp.issue(dto.phone, 'signup');
    return { userId: user.id };
  }

  async sendOtp(dto: SendOtpDto): Promise<void> {
    if (dto.purpose !== 'signup') {
      // Avoid revealing whether a phone number is registered.
      const user = await this.users.findByPhone(dto.phone);
      if (!user) {
        return;
      }
    }
    await this.otp.issue(dto.phone, dto.purpose);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<TokenPair> {
    await this.otp.verify(dto.phone, dto.purpose, dto.code);

    const user = await this.users.findByPhone(dto.phone);
    if (!user) {
      throw new BadRequestException('Compte introuvable pour ce numéro.');
    }

    if (dto.purpose === 'signup') {
      await this.users.markPhoneVerified(user.id);
    }

    return this.issueTokensForUser(user.id);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    if (!user.phoneVerifiedAt) {
      throw new UnauthorizedException('Numéro de téléphone non vérifié.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    await this.users.touchLastLogin(user.id);
    return this.issueTokensForUser(user.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!stored) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokensForUser(stored.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Re-derives the user's active business membership and issues a fresh token pair. */
  async issueTokensForUser(userId: string): Promise<TokenPair> {
    const membership = await this.prisma.businessMember.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });

    const payload: JwtPayload = {
      sub: userId,
      businessId: membership?.businessId ?? null,
      role: membership?.role ?? null,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = randomBytes(48).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
