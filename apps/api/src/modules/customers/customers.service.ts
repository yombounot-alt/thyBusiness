import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQuery } from './dto/list-customers.query';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { businessId, ...dto } });
  }

  async findAll(businessId: string, query: ListCustomersQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const where: Prisma.CustomerWhereInput = {
      businessId,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) {
      throw new NotFoundException('Client introuvable.');
    }
    return customer;
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(businessId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce client a des ventes ou des crédits associés, il ne peut pas être supprimé.',
        );
      }
      throw error;
    }
  }
}
