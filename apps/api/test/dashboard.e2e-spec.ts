import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: any;

  const userA = { phone: '+224650000001', password: 'MotDePasse123!', fullName: 'Gérante Dash A' };
  const userB = { phone: '+224650000002', password: 'MotDePasse123!', fullName: 'Gérant Dash B' };

  async function signupLoginAndCreateBusiness(user: typeof userA, businessName: string) {
    await request(server).post('/auth/signup').send(user).expect(201);
    const otp = await prisma.otpVerification.findFirst({
      where: { phone: user.phone },
      orderBy: { createdAt: 'desc' },
    });
    const verifyRes = await request(server)
      .post('/auth/otp/verify')
      .send({ phone: user.phone, purpose: 'signup', code: otp!.code })
      .expect(201);

    const businessRes = await request(server)
      .post('/businesses')
      .set('Authorization', `Bearer ${verifyRes.body.accessToken}`)
      .send({ name: businessName, businessType: 'commerce' })
      .expect(201);

    return { accessToken: businessRes.body.accessToken as string };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();

    prisma = new PrismaClient();

    const phones = [userA.phone, userB.phone];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const userIds = users.map((u) => u.id);
    const businessIds = (
      await prisma.business.findMany({ where: { ownerId: { in: userIds } } })
    ).map((b) => b.id);

    await prisma.creditPayment.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.customerCredit.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.payment.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId: { in: businessIds } } } });
    await prisma.sale.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.inventoryMovement.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.expense.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.customer.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.product.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.category.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.businessMember.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.otpVerification.deleteMany({ where: { phone: { in: phones } } });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let a: Awaited<ReturnType<typeof signupLoginAndCreateBusiness>>;
  let b: Awaited<ReturnType<typeof signupLoginAndCreateBusiness>>;
  let customerId: string;

  it('builds a full day of activity for business A', async () => {
    a = await signupLoginAndCreateBusiness(userA, 'Boutique Dashboard A');
    b = await signupLoginAndCreateBusiness(userB, 'Boutique Dashboard B');

    const product1 = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({
        name: 'Produit Populaire',
        purchasePrice: 3000,
        salePrice: 5000,
        initialStock: 50,
        lowStockThreshold: 10,
      })
      .expect(201);

    const product2 = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({
        name: 'Produit Rare',
        purchasePrice: 2000,
        salePrice: 8000,
        initialStock: 5,
        lowStockThreshold: 100,
      })
      .expect(201);

    const customer = await request(server)
      .post('/customers')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ fullName: 'Client Dashboard' })
      .expect(201);
    customerId = customer.body.id;

    // Sale 1: fully paid, no customer.
    await request(server)
      .post('/sales')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({
        items: [{ productId: product1.body.id, quantity: 2 }],
        payments: [{ method: 'cash', amount: 10000 }],
      })
      .expect(201);

    // Sale 2: underpaid, tied to the customer -> auto-credit of 5000, no due date.
    await request(server)
      .post('/sales')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({
        items: [{ productId: product2.body.id, quantity: 1 }],
        payments: [{ method: 'cash', amount: 3000 }],
        customerId: customer.body.id,
      })
      .expect(201);

    // A manual, overdue credit.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await request(server)
      .post(`/customers/${customer.body.id}/credits`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ amount: 20000, dueDate: yesterday, note: 'Ancienne dette' })
      .expect(201);

    // An expense today.
    await request(server)
      .post('/expenses')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ category: 'transport', amount: 5000 })
      .expect(201);
  });

  it("computes today's summary correctly", async () => {
    const res = await request(server)
      .get('/dashboard/summary?period=today')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(res.body.revenue).toBe(18000);
    expect(res.body.cogs).toBe(8000);
    expect(res.body.expensesTotal).toBe(5000);
    expect(res.body.profit).toBe(5000);
    expect(res.body.ordersCount).toBe(2);
    expect(res.body.lowStockCount).toBe(1);
    expect(res.body.outstandingCredits).toBe(25000);
    expect(res.body.overdueCreditsCount).toBe(1);
  });

  it('does not count a credit due today as overdue', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await request(server)
      .post(`/customers/${customerId}/credits`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ amount: 7000, dueDate: today })
      .expect(201);

    const res = await request(server)
      .get('/dashboard/summary?period=today')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(res.body.outstandingCredits).toBe(32000); // 25000 + 7000 now owed
    expect(res.body.overdueCreditsCount).toBe(1); // still only the one due yesterday
  });

  it('shows an isolated, empty summary for business B', async () => {
    const res = await request(server)
      .get('/dashboard/summary?period=today')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);

    expect(res.body.revenue).toBe(0);
    expect(res.body.ordersCount).toBe(0);
    expect(res.body.outstandingCredits).toBe(0);
  });

  it("includes today's revenue in the 7-day sales chart", async () => {
    const res = await request(server)
      .get('/dashboard/sales-chart?days=7')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(7);
    const today = new Date().toISOString().slice(0, 10);
    const todayBucket = res.body.find((b: { date: string }) => b.date === today);
    expect(todayBucket.revenue).toBe(18000);
  });

  it('ranks products by revenue', async () => {
    const res = await request(server)
      .get('/dashboard/top-products?period=today')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Produit Populaire');
    expect(res.body[0].revenue).toBe(10000);
    expect(res.body[1].revenue).toBe(8000);
  });

  it('rejects period=custom without from/to', async () => {
    await request(server)
      .get('/dashboard/summary?period=custom')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(400);
  });
});
