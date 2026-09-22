import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQuery } from './dto/list-expenses.query';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, dto: CreateExpenseDto, recordedBy: string) {
    return this.prisma.expense.create({
      data: {
        businessId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        recordedBy,
      },
    });
  }

  async findAll(businessId: string, query: ListExpensesQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const where: Prisma.ExpenseWhereInput = {
      businessId,
      ...(query.from || query.to
        ? {
            expenseDate: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total, sum] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    // Sum over the whole filtered period, not just the returned page.
    return { items, total, page, pageSize, totalAmount: Number(sum._sum.amount ?? 0) };
  }

  async findOne(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, businessId } });
    if (!expense) {
      throw new NotFoundException('Dépense introuvable.');
    }
    return expense;
  }

  async update(businessId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(businessId, id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
      },
    });
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    await this.prisma.expense.delete({ where: { id } });
  }
}
