import { Injectable, NotFoundException } from '@nestjs/common';
import { Business } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

export interface BusinessMembershipSummary {
  id: string;
  name: string;
  currency: string;
  role: string;
}

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto): Promise<Business> {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.name,
          businessType: dto.businessType,
          currency: dto.currency ?? 'GNF',
          phone: dto.phone,
          address: dto.address,
          ownerId: userId,
        },
      });

      await tx.businessMember.create({
        data: { businessId: business.id, userId, role: 'owner' },
      });

      return business;
    });
  }

  async listForUser(userId: string): Promise<BusinessMembershipSummary[]> {
    const memberships = await this.prisma.businessMember.findMany({
      where: { userId, status: 'active' },
      include: { business: { select: { id: true, name: true, currency: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      currency: m.business.currency,
      role: m.role,
    }));
  }

  async getCurrent(businessId: string): Promise<Business> {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Entreprise introuvable.');
    }
    return business;
  }

  async updateCurrent(businessId: string, dto: UpdateBusinessDto): Promise<Business> {
    await this.getCurrent(businessId);
    return this.prisma.business.update({ where: { id: businessId }, data: dto });
  }
}
