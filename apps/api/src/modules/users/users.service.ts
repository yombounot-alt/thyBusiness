import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { phone: string; passwordHash: string; fullName: string; email?: string }) {
    const existing = await this.findByPhone(data.phone);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone.');
    }
    return this.prisma.user.create({ data });
  }

  markPhoneVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() },
    });
  }

  touchLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
