import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { round2 } from '../../common/money';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GrantCreditDto } from './dto/grant-credit.dto';
import { ListCreditsQuery } from './dto/list-credits.query';
import { RecordCreditPaymentDto } from './dto/record-credit-payment.dto';

export interface CreateCreditParams {
  businessId: string;
  customerId: string;
  amount: number;
  saleId?: string;
  dueDate?: Date;
  note?: string;
  createdBy: string;
}

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCustomerExists(
    tx: Prisma.TransactionClient | PrismaService,
    businessId: string,
    customerId: string,
  ) {
    const customer = await tx.customer.findFirst({ where: { id: customerId, businessId } });
    if (!customer) {
      throw new NotFoundException('Client introuvable.');
    }
    return customer;
  }

  /** Runs inside a caller-supplied transaction — used by SalesService to credit an underpaid sale atomically. */
  async createCredit(tx: Prisma.TransactionClient, params: CreateCreditParams) {
    const credit = await tx.customerCredit.create({
      data: {
        businessId: params.businessId,
        customerId: params.customerId,
        saleId: params.saleId,
        originalAmount: params.amount,
        remainingAmount: params.amount,
        dueDate: params.dueDate,
        note: params.note,
        createdBy: params.createdBy,
      },
    });

    await tx.customer.update({
      where: { id: params.customerId },
      data: { currentBalance: { increment: params.amount } },
    });

    return credit;
  }

  async grantManual(
    businessId: string,
    customerId: string,
    dto: GrantCreditDto,
    createdBy: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertCustomerExists(tx, businessId, customerId);
      return this.createCredit(tx, {
        businessId,
        customerId,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        note: dto.note,
        createdBy,
      });
    });
  }

  async recordPayment(
    businessId: string,
    customerId: string,
    dto: RecordCreditPaymentDto,
    receivedBy: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertCustomerExists(tx, businessId, customerId);

      const openCredits = await tx.customerCredit.findMany({
        where: { businessId, customerId, status: { in: ['open', 'partially_paid'] } },
        orderBy: { createdAt: 'asc' },
      });

      const totalOutstanding = round2(
        openCredits.reduce((sum, c) => sum + Number(c.remainingAmount), 0),
      );
      if (totalOutstanding <= 0) {
        throw new BadRequestException("Ce client n'a aucune dette en cours.");
      }
      if (dto.amount > totalOutstanding) {
        throw new BadRequestException(
          `Le montant dépasse la dette totale du client (${totalOutstanding}).`,
        );
      }

      let remaining = dto.amount;
      const paymentsCreated = [];

      for (const credit of openCredits) {
        if (remaining <= 0) break;

        const applied = Math.min(remaining, Number(credit.remainingAmount));
        remaining = round2(remaining - applied);
        const newRemaining = round2(Number(credit.remainingAmount) - applied);

        await tx.customerCredit.update({
          where: { id: credit.id },
          data: {
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'paid' : 'partially_paid',
          },
        });

        const payment = await tx.creditPayment.create({
          data: {
            businessId,
            customerId,
            customerCreditId: credit.id,
            amount: applied,
            method: dto.method,
            note: dto.note,
            receivedBy,
          },
        });
        paymentsCreated.push(payment);
      }

      await tx.customer.update({
        where: { id: customerId },
        data: { currentBalance: { decrement: dto.amount } },
      });

      return paymentsCreated;
    });
  }

  async listForCustomer(businessId: string, customerId: string) {
    await this.assertCustomerExists(this.prisma, businessId, customerId);
    return this.prisma.customerCredit.findMany({
      where: { businessId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatement(businessId: string, customerId: string) {
    await this.assertCustomerExists(this.prisma, businessId, customerId);

    const [credits, payments] = await Promise.all([
      this.prisma.customerCredit.findMany({ where: { businessId, customerId } }),
      this.prisma.creditPayment.findMany({ where: { businessId, customerId } }),
    ]);

    const entries = [
      ...credits.map((c) => ({ kind: 'credit' as const, date: c.createdAt, ...c })),
      ...payments.map((p) => ({ kind: 'payment' as const, date: p.paidAt, ...p })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    return entries;
  }

  async listBusinessWide(businessId: string, query: ListCreditsQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const outstandingOnly = query.status === 'outstanding';
    const where: Prisma.CustomerCreditWhereInput = {
      businessId,
      ...(outstandingOnly
        ? { status: { in: ['open', 'partially_paid'] } }
        : query.status
          ? { status: query.status }
          : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customerCredit.findMany({
        where,
        // Still-owed credits: earliest due date first (undated last) so late ones surface on top.
        orderBy: outstandingOnly
          ? [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }]
          : { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: { select: { id: true, fullName: true, phone: true } } },
      }),
      this.prisma.customerCredit.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
